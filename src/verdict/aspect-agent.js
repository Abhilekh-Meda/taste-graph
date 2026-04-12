const MAX_TURNS = 10;
const MIN_RESULTS_BEFORE_FALLBACK = 2;

// Runs a single aspect agent against a submission.
// Returns { verdict, turns, aspect_key }
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

  const searchTool = buildSearchTool();
  const verdictTool = buildVerdictTool(aspect.verdictSchema);

  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(aspect, person, judgingContext),
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Here is the submission you are judging:' },
        submissionBlock,
        { type: 'text', text: '\nBegin your investigation. Use search_profile to retrieve relevant context from the taste profile. Call produce_verdict when you have enough evidence.' },
      ],
    },
  ];

  const turns = [];

  for (let i = 0; i < MAX_TURNS; i++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: [searchTool, verdictTool],
      tool_choice: 'required',
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    const toolCall = msg.tool_calls?.[0];
    if (!toolCall) break;

    const args = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === 'produce_verdict') {
      return { verdict: args, turns, aspect_key: aspect.key };
    }

    // search_profile
    const query = args.query;
    const content = await searchAspectContext({ query, person, personTag, aspect, contextId, nia });

    turns.push({
      turn: i + 1,
      query,
      thought: msg.content ?? '',
      result_preview: content.slice(0, 300),
    });

    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content,
    });
  }

  // Hit max turns — force a verdict from what has been gathered
  const forceResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'You have reached the investigation limit. Produce your verdict now based on everything gathered so far.',
      },
    ],
    tools: [verdictTool],
    tool_choice: { type: 'function', function: { name: 'produce_verdict' } },
  });

  const forced = JSON.parse(
    forceResponse.choices[0].message.tool_calls[0].function.arguments
  );
  return { verdict: forced, turns, aspect_key: aspect.key, forced: true };
}

async function searchAspectContext({ query, person, personTag, aspect, contextId, nia }) {
  const fullQuery = `${person} ${query}`;

  let results = [];
  try {
    const res = await nia.searchContexts(fullQuery, { limit: 8 });
    // Filter to this person's dimension only
    results = (res.results ?? []).filter(
      (r) => r.tags?.includes(personTag) && r.tags?.includes(aspect.key)
    );
  } catch (err) {
    console.warn(`[aspect-agent/${aspect.key}] search failed: ${err.message}`);
  }

  if (results.length >= MIN_RESULTS_BEFORE_FALLBACK) {
    return results.map((r) => r.content).join('\n\n---\n\n');
  }

  // Fallback: load the full dimension context by ID
  console.log(`[aspect-agent/${aspect.key}] sparse results (${results.length}), loading full context`);
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
    judgingContext
      ? `Judging context: "${judgingContext}" — keep this context in mind throughout your analysis.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSearchTool() {
  return {
    type: 'function',
    function: {
      name: 'search_profile',
      description: 'Search the taste profile for relevant context about this dimension. Call multiple times with different queries to build a thorough picture.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for — be specific, use terms from the submission and the dimension you are analyzing',
          },
        },
        required: ['query'],
      },
    },
  };
}

function buildVerdictTool(verdictSchema) {
  return {
    type: 'function',
    function: {
      name: 'produce_verdict',
      description: 'Finalize your analysis and produce the verdict for this taste dimension. Only call when you have enough evidence.',
      parameters: {
        type: 'object',
        properties: verdictSchema,
        required: Object.keys(verdictSchema),
      },
    },
  };
}
