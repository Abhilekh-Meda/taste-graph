// Phase 3: Run parallel Oracle jobs, one per taste dimension
import { parseJsonReport } from './nia.js';

const ASPECTS = [
  {
    key: 'stated_vs_actual',
    label: 'Stated values vs actual reactions',
    query: (name) => `
Analyze ${name}'s taste by finding the gap between what they SAY they value and what they ACTUALLY respond well to.

Find:
- Their explicitly stated values, principles, and aesthetic criteria (essays, interviews, talks)
- Specific things they have publicly praised, endorsed, or expressed excitement about
- Specific things they have publicly criticized, dismissed, or expressed skepticism about
- Cases where their actual reactions CONTRADICT their stated principles
- The most revealing contradictions — where their gut reaction diverged from their stated framework

Return as structured JSON:
{
  "stated_values": [{ "value": "...", "source_quote": "...", "source_url": "..." }],
  "praised": [{ "thing": "...", "reaction": "...", "source_url": "..." }],
  "criticized": [{ "thing": "...", "reaction": "...", "source_url": "..." }],
  "contradictions": [{ "stated_principle": "...", "actual_reaction": "...", "tension": "...", "source_url": "..." }]
}
    `.trim(),
  },
  {
    key: 'taste_drift',
    label: 'Taste drift over time',
    query: (name) => `
Map how ${name}'s taste and judgment has evolved over time.

Find:
- Early positions or opinions they later reversed or softened
- Topics where their view has clearly shifted
- What they valued at different stages of their career
- Whether their standards have gotten stricter or more relaxed over time
- Any public acknowledgments of having been wrong

Return as structured JSON:
{
  "timeline": [
    { "period": "...", "dominant_values": ["..."], "notable_positions": ["..."] }
  ],
  "reversals": [{ "original_position": "...", "current_position": "...", "when": "...", "source_url": "..." }],
  "drift_summary": "2-3 sentence summary of how their taste has evolved"
}
    `.trim(),
  },
  {
    key: 'blind_spots',
    label: 'Blind spots and systematic misjudgments',
    query: (name) => `
Identify categories where ${name} has historically been wrong or systematically biased in their judgment.

Find:
- Things they dismissed or underestimated that turned out to be significant
- Categories where their predictions or endorsements have been consistently off
- Known biases they themselves have acknowledged
- Patterns in what kinds of things they consistently miss or misread

Return as structured JSON:
{
  "blind_spots": [
    {
      "category": "...",
      "pattern": "...",
      "examples": [{ "thing": "...", "their_reaction": "...", "what_happened": "...", "source_url": "..." }],
      "confidence": "high|medium|low"
    }
  ],
  "self_acknowledged_biases": [{ "bias": "...", "quote": "...", "source_url": "..." }]
}
    `.trim(),
  },
  {
    key: 'influence_graph',
    label: 'Intellectual lineage and influences',
    query: (name) => `
Map who and what has shaped ${name}'s taste and worldview.

Find:
- People they explicitly cite as influences or mentors
- Books, ideas, or movements they frequently reference
- Who they defer to or quote approvingly
- The intellectual traditions or schools of thought they belong to
- People they have publicly disagreed with and why

Return as structured JSON:
{
  "people": [
    { "name": "...", "relationship": "mentor|peer|influence|critic", "domain": "...", "evidence": "...", "source_url": "..." }
  ],
  "ideas_movements": [{ "name": "...", "influence": "...", "source_url": "..." }],
  "books": [{ "title": "...", "author": "...", "how_referenced": "...", "source_url": "..." }]
}
    `.trim(),
  },
  {
    key: 'contextual_variation',
    label: 'How judgment shifts by context',
    query: (name) => `
Analyze how ${name}'s standards and judgment change depending on context — stakes, audience, domain, or framing.

Find:
- How they judge differently in high-stakes vs low-stakes situations
- Whether they apply different standards in different domains
- How their public statements differ from their revealed preferences
- Any evidence of code-switching between contexts (formal vs informal, public vs private)

Return as structured JSON:
{
  "contexts": [
    {
      "context": "...",
      "how_they_judge": "...",
      "standards_applied": ["..."],
      "example": "...",
      "source_url": "..."
    }
  ],
  "context_summary": "2-3 sentence summary of how context shapes their judgment"
}
    `.trim(),
  },
  {
    key: 'linguistic_tells',
    label: 'Linguistic signals of approval and disapproval',
    query: (name) => `
Analyze the specific language patterns ${name} uses to signal genuine excitement vs polite interest vs criticism.

Find:
- Words or phrases they use when genuinely excited about something
- Words or phrases they use when being diplomatically negative
- How they signal strong disapproval
- Hedging patterns they use when unsure
- Examples of each pattern in context

Return as structured JSON:
{
  "excited_signals": [{ "pattern": "...", "example_quote": "...", "source_url": "..." }],
  "polite_dismissal_signals": [{ "pattern": "...", "example_quote": "...", "source_url": "..." }],
  "strong_disapproval_signals": [{ "pattern": "...", "example_quote": "...", "source_url": "..." }],
  "uncertainty_signals": [{ "pattern": "...", "example_quote": "...", "source_url": "..." }]
}
    `.trim(),
  },
  {
    key: 'falsifiability',
    label: 'Known public reactions for model testing',
    query: (name) => `
Find specific documented cases where ${name} publicly reacted to something — praised it, criticized it, funded it, rejected it, or made a prediction about it. These will be used to test a taste model.

Find as many concrete, verifiable reactions as possible:
- Investments they made or passed on (with stated reasoning)
- Public endorsements of specific products, companies, or ideas
- Explicit predictions they made about specific things
- Public dismissals of things that became successful (or vice versa)
- Reviews or ratings they gave

Return as structured JSON:
{
  "reactions": [
    {
      "subject": "...",
      "reaction_type": "praised|criticized|funded|rejected|predicted_success|predicted_failure",
      "their_reaction": "...",
      "outcome": "what actually happened, if known",
      "date": "approximate date or period",
      "source_url": "..."
    }
  ]
}
    `.trim(),
  },
];

export async function runAspectOracles(name, nia, indexedSourceIds = []) {
  console.log(`[aspects] Running ${ASPECTS.length} aspect oracles in parallel for ${name}`);

  const jobs = await Promise.all(
    ASPECTS.map((aspect) => launchAspectOracle(aspect, name, nia, indexedSourceIds))
  );

  console.log('[aspects] All oracle jobs launched, streaming results...');

  const results = await Promise.allSettled(
    jobs.map((job) => collectOracleResult(job, nia))
  );

  const profile = {};

  results.forEach((result, i) => {
    const aspect = ASPECTS[i];
    if (result.status === 'fulfilled') {
      profile[aspect.key] = {
        label: aspect.label,
        ...result.value,
      };
      console.log(`[aspects] ✓ ${aspect.label}`);
    } else {
      profile[aspect.key] = {
        label: aspect.label,
        error: result.reason?.message,
      };
      console.error(`[aspects] ✗ ${aspect.label}: ${result.reason?.message}`);
    }
  });

  return profile;
}

async function launchAspectOracle(aspect, name, nia, dataSources) {
  const { job_id, session_id } = await nia.createOracleJob(aspect.query(name), {
    dataSources,
    model: 'claude-opus-4-6-1m',
    outputFormat: 'json',
  });
  console.log(`[aspects] Launched: ${aspect.label} (job: ${job_id})`);
  return { job_id, session_id, aspect };
}

async function collectOracleResult({ job_id }, nia) {
  let final_report = '';
  let citations = [];

  await nia.streamOracleJob(job_id, (chunk) => {
    if (chunk.type === 'complete' && chunk.result) {
      final_report = chunk.result.final_report ?? '';
      citations = chunk.result.citations ?? [];
    }
  });

  const data = parseJsonReport(final_report);
  return { final_report, citations, data };
}
