const MAX_TURNS = 6;
const MIN_RESULTS_BEFORE_FALLBACK = 2;

export async function runAspectAgent({
  aspect,
  person,
  contextId,
  submissionBlock,
  judgingContext,
  nia,
  openai,
}) {
  const personTag = person.toLowerCase().replace(/\s+/g, '-');
  const tools = [buildSearchTool(), buildVerdictTool(aspect.verdictSchema)];

  const messages = [
    { role: 'system', content: buildSystemPrompt(aspect, person, judgingContext) },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Here is the submission you are judging:' },
        submissionBlock,
        { type: 'text', text: '\nBegin your investigation.' },
      ],
    },
  ];

  const turns = [];

  for (let i = 0; i < MAX_TURNS; i++) {
    // Phase 1: THINK — model must reason before acting
    const thinkResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: [buildThinkTool()],
      tool_choice: { type: 'function', function: { name: 'think' } },
    });

    const thinkMsg = thinkResponse.choices[0].message;
    messages.push(thinkMsg);

    const thinkArgs = JSON.parse(thinkMsg.tool_calls[0].function.arguments);
    messages.push({ role: 'tool', tool_call_id: thinkMsg.tool_calls[0].id, content: 'OK' });

    // Phase 2: ACT — model must search or produce verdict
    const actResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
      tool_choice: 'required',
    });

    const actMsg = actResponse.choices[0].message;
    messages.push(actMsg);

    const toolCall = actMsg.tool_calls[0];
    const actArgs = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === 'produce_verdict') {
      turns.push({ turn: i + 1, thinking: thinkArgs.reasoning, action: 'verdict' });
      return { verdict: actArgs, turns, aspect_key: aspect.key, final_reasoning: thinkArgs.reasoning };
    }

    // search_profile — execute all queries in parallel
    const queries = actArgs.queries;
    const content = await searchBatch({ queries, person, personTag, aspect, contextId, nia });

    turns.push({
      turn: i + 1,
      thinking: thinkArgs.reasoning,
      action: 'search',
      queries,
      result_preview: content.slice(0, 400),
    });

    messages.push({ role: 'tool', tool_call_id: toolCall.id, content });
  }

  // Hit limit — force verdict
  messages.push({
    role: 'user',
    content: 'You have reached the investigation limit. Produce your verdict now with what you have.',
  });

  const forceResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools: [buildVerdictTool(aspect.verdictSchema)],
    tool_choice: { type: 'function', function: { name: 'produce_verdict' } },
  });

  const forced = JSON.parse(forceResponse.choices[0].message.tool_calls[0].function.arguments);
  const lastThinking = turns.length > 0 ? turns[turns.length - 1].thinking : null;
  return { verdict: forced, turns, aspect_key: aspect.key, forced: true, final_reasoning: lastThinking };
}

async function searchBatch({ queries, person, personTag, aspect, contextId, nia }) {
  const searches = queries.map(async (q) => {
    try {
      const res = await nia.searchContexts(`${person} ${q}`, { limit: 5 });
      return (res.results ?? []).filter(
        (r) => r.tags?.includes(personTag) && r.tags?.includes(aspect.key)
      );
    } catch {
      return [];
    }
  });

  const allResults = (await Promise.all(searches)).flat();

  // Deduplicate by content hash
  const seen = new Set();
  const unique = allResults.filter((r) => {
    const key = r.id ?? r.content?.slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length >= MIN_RESULTS_BEFORE_FALLBACK) {
    return unique.map((r) => r.content).join('\n\n---\n\n');
  }

  // Fallback: full dimension context
  console.log(`[aspect-agent/${aspect.key}] sparse results (${unique.length}/${queries.length} queries), loading full context`);
  try {
    const ctx = await nia.getContext(contextId);
    return ctx.content;
  } catch (err) {
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
