import { withRetry } from '../retry.js';

const MAX_TURNS = 6;
const MIN_RESULTS_BEFORE_FALLBACK = 2;

export async function runAspectAgent({
  aspect,
  person,
  contextId,
  submissionBlocks,
  judgingContext,
  nia,
  openai,
  onProgress,
}) {
  const emit = onProgress ?? (() => {});
  const personTag = person.toLowerCase().replace(/\s+/g, '-');
  const tools = [buildSearchTool(), buildVerdictTool(aspect.verdictSchema)];

  console.log(`\n[agent/${aspect.key}] Starting — context: ${contextId}`);

  const messages = [
    { role: 'system', content: buildSystemPrompt(aspect, person, judgingContext) },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Here is the submission you are judging:' },
        ...submissionBlocks,
        { type: 'text', text: '\nBegin your investigation.' },
      ],
    },
  ];

  const turns = [];

  for (let i = 0; i < MAX_TURNS; i++) {
    console.log(`[agent/${aspect.key}] Turn ${i + 1} — THINK`);
    emit({ type: 'verdict:agent_turn', data: { key: aspect.key, turn: i + 1, max: MAX_TURNS, phase: 'thinking' } });
    const thinkResponse = await withRetry(
      () => openai.chat.completions.create({
        model: 'gpt-5.4',
        messages,
        tools: [buildThinkTool()],
        tool_choice: { type: 'function', function: { name: 'think' } },
      }),
      `agent/${aspect.key}/think`
    );

    const thinkMsg = thinkResponse.choices[0].message;
    messages.push(thinkMsg);

    const thinkArgs = JSON.parse(thinkMsg.tool_calls[0].function.arguments);
    console.log(`[agent/${aspect.key}] Reasoning: ${thinkArgs.reasoning.slice(0, 200)}...`);
    emit({ type: 'verdict:agent_think', data: { key: aspect.key, reasoning_preview: thinkArgs.reasoning.slice(0, 200) } });
    messages.push({ role: 'tool', tool_call_id: thinkMsg.tool_calls[0].id, content: 'OK' });

    console.log(`[agent/${aspect.key}] Turn ${i + 1} — ACT`);
    emit({ type: 'verdict:agent_turn', data: { key: aspect.key, turn: i + 1, max: MAX_TURNS, phase: 'acting' } });
    const actResponse = await withRetry(
      () => openai.chat.completions.create({
        model: 'gpt-5.4',
        messages,
        tools,
        tool_choice: 'required',
      }),
      `agent/${aspect.key}/act`
    );

    const actMsg = actResponse.choices[0].message;
    messages.push(actMsg);

    const toolCall = actMsg.tool_calls[0];
    const actArgs = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === 'produce_verdict') {
      console.log(`[agent/${aspect.key}] → VERDICT after ${i + 1} turn(s)`);
      turns.push({ turn: i + 1, thinking: thinkArgs.reasoning, action: 'verdict' });
      return { verdict: actArgs, turns, aspect_key: aspect.key, final_reasoning: thinkArgs.reasoning };
    }

    // search_profile — execute all queries in parallel
    const queries = actArgs.queries;
    console.log(`[agent/${aspect.key}] → SEARCH (${queries.length} queries): ${queries.join(' | ')}`);
    emit({ type: 'verdict:agent_search', data: { key: aspect.key, queries } });
    const content = await searchBatch({ queries, person, personTag, aspect, contextId, nia, emit });
    console.log(`[agent/${aspect.key}] Search returned ${content.length} chars`);
    emit({ type: 'verdict:agent_search_done', data: { key: aspect.key, chars: content.length } });

    turns.push({
      turn: i + 1,
      thinking: thinkArgs.reasoning,
      action: 'search',
      queries,
      result_preview: content.slice(0, 400),
    });

    messages.push({ role: 'tool', tool_call_id: toolCall.id, content });
  }

  console.log(`[agent/${aspect.key}] Hit turn limit — forcing verdict`);
  emit({ type: 'verdict:agent_think', data: { key: aspect.key, reasoning_preview: 'Reached investigation limit, producing verdict...' } });
  // Close out any dangling tool calls so OpenAI doesn't reject the message chain
  const pendingToolCallIds = new Set();
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) pendingToolCallIds.add(tc.id);
    }
    if (msg.role === 'tool') pendingToolCallIds.delete(msg.tool_call_id);
  }
  for (const id of pendingToolCallIds) {
    messages.push({ role: 'tool', tool_call_id: id, content: 'Investigation limit reached.' });
  }
  if (pendingToolCallIds.size > 0) {
    console.log(`[agent/${aspect.key}] Closed ${pendingToolCallIds.size} dangling tool call(s)`);
  }

  // Hit limit — force verdict
  messages.push({
    role: 'user',
    content: 'You have reached the investigation limit. Produce your verdict now with what you have.',
  });

  const forceResponse = await withRetry(
    () => openai.chat.completions.create({
      model: 'gpt-5.4',
      messages,
      tools: [buildVerdictTool(aspect.verdictSchema)],
      tool_choice: { type: 'function', function: { name: 'produce_verdict' } },
    }),
    `agent/${aspect.key}/force-verdict`
  );

  const forced = JSON.parse(forceResponse.choices[0].message.tool_calls[0].function.arguments);
  const lastThinking = turns.length > 0 ? turns[turns.length - 1].thinking : null;
  console.log(`[agent/${aspect.key}] → FORCED VERDICT`);
  return { verdict: forced, turns, aspect_key: aspect.key, forced: true, final_reasoning: lastThinking };
}

async function searchBatch({ queries, person, personTag, aspect, contextId, nia }) {
  console.log(`[agent/${aspect.key}] searchBatch: ${queries.length} queries against context ${contextId}`);
  const searches = queries.map(async (q) => {
    try {
      const res = await nia.searchContexts(`${person} ${q}`, { limit: 5 });
      const filtered = (res.results ?? []).filter(
        (r) => r.tags?.includes(personTag) && r.tags?.includes(aspect.key)
      );
      console.log(`[agent/${aspect.key}]   query "${q}" → ${filtered.length} results`);
      return filtered;
    } catch (err) {
      console.warn(`[agent/${aspect.key}]   query "${q}" → ERROR: ${err.message}`);
      return [];
    }
  });

  const allResults = (await Promise.all(searches)).flat();

  // Deduplicate by id or content prefix
  const seen = new Set();
  const unique = allResults.filter((r) => {
    const key = r.id ?? r.content?.slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[agent/${aspect.key}] searchBatch: ${unique.length} unique results`);

  if (unique.length >= MIN_RESULTS_BEFORE_FALLBACK) {
    return unique.map((r) => r.content).join('\n\n---\n\n');
  }

  console.log(`[agent/${aspect.key}] Sparse results — loading full context ${contextId}`);
  try {
    const ctx = await nia.getContext(contextId);
    console.log(`[agent/${aspect.key}] Full context loaded: ${ctx.content?.length ?? 0} chars`);
    return ctx.content;
  } catch (err) {
    console.error(`[agent/${aspect.key}] Failed to load context: ${err.message}`);
    return `No context available for ${aspect.label}: ${err.message}`;
  }
}

function buildSystemPrompt(aspect, person, judgingContext) {
  return [
    aspect.systemPrompt(person),
    '',
    'PROCESS: Each turn you MUST think first (reason about what you know and what you still need), then act (search or produce verdict).',
    'You can submit multiple search queries at once to cover different angles efficiently.',
    'Your memory persists across turns — you can see all your prior reasoning and search results.',
    'Keep searching as long as you are finding useful new evidence. Only produce your verdict when you are confident you have enough, or when you stop finding new information.',
    'You have up to 6 turns. Use as many as you need — do not rush to a verdict if there are still gaps in your understanding.',
    '',
    judgingContext ? `Judging context: "${judgingContext}"` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildThinkTool() {
  return {
    type: 'function',
    function: {
      name: 'think',
      description: 'Reason about what you know so far and what you need to investigate next. Called before every action.',
      parameters: {
        type: 'object',
        properties: {
          reasoning: {
            type: 'string',
            description: 'Your current understanding, what evidence you have, what gaps remain, and what to search for next (or why you are ready to produce a verdict)',
          },
        },
        required: ['reasoning'],
      },
    },
  };
}

function buildSearchTool() {
  return {
    type: 'function',
    function: {
      name: 'search_profile',
      description: 'Search the taste profile with multiple queries at once. Each query runs in parallel against the indexed profile.',
      parameters: {
        type: 'object',
        properties: {
          queries: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 5,
            description: 'Search queries — be specific, use terms from the submission and the dimension you are analyzing. Multiple queries let you cover different angles in one turn.',
          },
        },
        required: ['queries'],
      },
    },
  };
}

function buildVerdictTool(verdictSchema) {
  return {
    type: 'function',
    function: {
      name: 'produce_verdict',
      description: 'Finalize your analysis. Only call after you have thought through the evidence.',
      parameters: {
        type: 'object',
        properties: verdictSchema,
        required: Object.keys(verdictSchema),
      },
    },
  };
}
