import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = resolve(__dirname, 'profiles', 'arlan-rakhmetzhanov');
const EVENTS_PATH = resolve(__dirname, 'demo-data', 'events.json');
const OUTPUT_PATH = resolve(__dirname, 'demo-data', 'demo-timeline.json');

const TOTAL_MS = 150_000; // 2.5 minutes
const PROFILE_END_MS = 90_000; // first 1.5 min for profiling
const VERDICT_START_MS = 92_000;
const VERDICT_END_MS = TOTAL_MS;

const SOURCES = [
  { url: 'https://www.arlanrakh.com/', type: 'website' },
  { url: 'https://substack.com/@arlanrakhmetzhanov', type: 'substack' },
  { url: 'https://x.com/arlanr', type: 'twitter' },
  { url: 'https://www.linkedin.com/in/arlan-rakhmetzhanov', type: 'linkedin' },
  { url: 'https://github.com/arlanrakh', type: 'github' },
  { url: 'https://www.producthunt.com/@arlanrakh', type: 'product hunt' },
  { url: 'https://skillful.sh/authors/arlanrakh', type: 'blog' },
  { url: 'https://www.linkedin.com/posts/arlan-rakhmetzhanov_i-got-into-yc-s25...', type: 'linkedin post' },
  { url: 'https://www.linkedin.com/posts/arlan-rakhmetzhanov_i-am-a-high-schooler...', type: 'linkedin post' },
  { url: 'https://www.youtube.com/watch?v=7hukPKD4Bhs', type: 'youtube' },
  { url: 'https://www.youtube.com/watch?v=KBY0z6jSQsA', type: 'youtube' },
  { url: 'https://substack.com/home/post/p-153399793', type: 'substack' },
];

const ASPECTS = [
  { key: 'stated_vs_actual', label: 'Stated values vs actual reactions' },
  { key: 'taste_drift', label: 'Taste drift over time' },
  { key: 'blind_spots', label: 'Blind spots and systematic misjudgments' },
  { key: 'influence_graph', label: 'Intellectual lineage and influences' },
  { key: 'contextual_variation', label: 'How judgment shifts by context' },
  { key: 'linguistic_tells', label: 'Linguistic signals of approval and disapproval' },
  { key: 'falsifiability', label: 'Known public reactions for model testing' },
];

const DISCOVERY_MESSAGES = [
  "Searching for Arlan Rakhmetzhanov's public presence...",
  "Deep-searching blogs, interviews, essays, tweets...",
  "web_search: Arlan Rakhmetzhanov founder startup essays interviews",
  "web_search: Arlan Rakhmetzhanov YC Nozomi AI startup",
  "Completed: web_search",
  "read_url: reading arlanrakh.com",
  "Completed: read_url",
  "web_search: Arlan Rakhmetzhanov substack writing philosophy",
  "Completed: web_search",
  "read_url: reading LinkedIn profile and posts",
  "Completed: read_url",
  "web_search: Arlan Rakhmetzhanov opinions AI tools codegen taste",
  "Completed: web_search",
  "read_url: reading YouTube interview transcript",
  "Completed: read_url",
  "web_search: Arlan Rakhmetzhanov hackathon judging preferences",
  "Completed: web_search",
  "Compiling discovery report...",
];

const ASPECT_MESSAGES = {
  stated_vs_actual: [
    "Extracting stated principles from essays and posts...",
    "web_search: Arlan stated values entrepreneurship first principles",
    "Completed: web_search",
    "Cross-referencing against documented reactions...",
    "read_url: analyzing LinkedIn engagement patterns",
    "Completed: read_url",
    "Mapping gap between stated meritocracy and prestige signals...",
    "Compiling findings...",
  ],
  taste_drift: [
    "Analyzing early vs recent public statements...",
    "web_search: Arlan Rakhmetzhanov evolution views AI startups over time",
    "Completed: web_search",
    "Comparing 2023 posts to 2025 writing...",
    "read_url: reading What I Learned in 2024",
    "Completed: read_url",
    "Mapping temporal shifts in domain interest...",
    "Compiling findings...",
  ],
  blind_spots: [
    "Searching for documented misjudgments...",
    "web_search: Arlan Rakhmetzhanov wrong predictions errors",
    "Completed: web_search",
    "Analyzing systematic biases in endorsement patterns...",
    "web_search: Arlan Rakhmetzhanov bias blind spots judgment",
    "Completed: web_search",
    "Mapping error categories...",
    "Compiling findings...",
  ],
  influence_graph: [
    "Identifying intellectual influences...",
    "web_search: Arlan Rakhmetzhanov influences mentors Paul Graham Karpathy",
    "Completed: web_search",
    "read_url: analyzing referenced figures in writing",
    "Completed: read_url",
    "Mapping influence topology: PG, Karpathy, YC culture...",
    "Tracing aesthetic lineage from Silicon Valley canon...",
    "Compiling findings...",
  ],
  contextual_variation: [
    "Analyzing how judgment shifts by stakes...",
    "web_search: Arlan Rakhmetzhanov hackathon vs investment judgment",
    "Completed: web_search",
    "Comparing hackathon praise patterns vs serious critique...",
    "read_url: analyzing context-specific reactions",
    "Completed: read_url",
    "Mapping context variance across scenarios...",
    "Compiling findings...",
  ],
  linguistic_tells: [
    "Indexing excitement and disapproval signals...",
    "web_search: Arlan Rakhmetzhanov writing style linguistic patterns",
    "Completed: web_search",
    "read_url: corpus analysis of posts and essays",
    "Completed: read_url",
    "Mapping approval markers: hustle language, agency emphasis...",
    "Mapping disapproval markers: wrapper skepticism, low-agency signals...",
    "Compiling findings...",
  ],
  falsifiability: [
    "Building ground-truth dataset of known reactions...",
    "web_search: Arlan Rakhmetzhanov praised projects products documented reactions",
    "Completed: web_search",
    "Identifying testable reaction predictions...",
    "read_url: collecting public endorsements and criticisms",
    "Completed: read_url",
    "Computing estimated model accuracy...",
    "Compiling findings...",
  ],
};

function lerp(start, end, t) {
  return Math.round(start + (end - start) * t);
}

async function main() {
  const realEvents = JSON.parse(await readFile(EVENTS_PATH, 'utf8'));
  const timeline = [];

  let ms = 0;
  const push = (delay, event) => {
    ms += delay;
    timeline.push({ ...event, _ms: ms });
  };

  // === STAGE 1: Input animation (0–3s) ===
  push(0, { type: 'demo:input', data: { person: 'Arlan Rakhmetzhanov', context: 'hackathon judge', item: 'test_submission.txt' } });
  push(3000, { type: 'demo:submit' });

  // === STAGE 2: Profile building (3s–90s) ===
  push(500, { type: 'profile:start', data: { person: 'Arlan Rakhmetzhanov' } });
  push(800, { type: 'profile:discovery', data: { message: "Searching for Arlan Rakhmetzhanov's public presence..." } });

  // Discovery messages spread over ~25 seconds
  const discoverySpacing = 22_000 / DISCOVERY_MESSAGES.length;
  for (const msg of DISCOVERY_MESSAGES) {
    push(Math.round(discoverySpacing + (Math.random() - 0.5) * 600), {
      type: 'profile:discovery',
      data: { message: msg },
    });
  }

  push(1500, { type: 'profile:discovery_done', data: { sources_found: SOURCES.length, comparison: null } });

  // Indexing sources (~15 seconds)
  push(800, { type: 'profile:indexing', data: { count: SOURCES.length } });
  const indexSpacing = 14_000 / SOURCES.length;
  for (let i = 0; i < SOURCES.length; i++) {
    push(Math.round(indexSpacing * 0.3), {
      type: 'profile:source_indexing',
      data: { url: SOURCES[i].url, type: SOURCES[i].type, index: i, total: SOURCES.length },
    });
    push(Math.round(indexSpacing * 0.7 + (Math.random() - 0.5) * 400), {
      type: 'profile:source_indexed',
      data: { url: SOURCES[i].url, type: SOURCES[i].type, indexed: i + 1, total: SOURCES.length },
    });
  }
  push(500, { type: 'profile:indexing_done', data: { indexed: SOURCES.length, failed: 0 } });

  // Aspect oracles (~40 seconds total, overlapping)
  // Start all 7 at once
  for (const a of ASPECTS) {
    push(50, { type: 'profile:aspect_start', data: { key: a.key, label: a.label } });
  }

  // Stagger aspect progress messages
  const aspectOrder = [
    'contextual_variation', 'blind_spots', 'linguistic_tells',
    'taste_drift', 'falsifiability', 'stated_vs_actual', 'influence_graph',
  ];

  const ASPECT_PHASE_DURATION = 38_000;
  const messagesPerAspect = Object.values(ASPECT_MESSAGES)[0].length;
  const totalMessages = aspectOrder.length * messagesPerAspect;
  const msgInterval = ASPECT_PHASE_DURATION / totalMessages;

  let completedCount = 0;
  for (let msgIdx = 0; msgIdx < messagesPerAspect; msgIdx++) {
    for (const key of aspectOrder) {
      const msgs = ASPECT_MESSAGES[key];
      if (msgIdx >= msgs.length) continue;
      push(Math.round(msgInterval + (Math.random() - 0.5) * 300), {
        type: 'profile:aspect_progress',
        data: { key, message: msgs[msgIdx] },
      });
    }

    // Complete aspects after their last message
    if (msgIdx === messagesPerAspect - 1) {
      const completionOrder = [
        'contextual_variation', 'blind_spots', 'linguistic_tells', 'falsifiability',
        'taste_drift', 'stated_vs_actual', 'influence_graph',
      ];
      for (const key of completionOrder) {
        push(Math.round(800 + Math.random() * 400), {
          type: 'profile:aspect_done',
          data: { key, label: ASPECTS.find(a => a.key === key).label },
        });
      }
    }
  }

  push(1500, { type: 'profile:saving', data: { message: 'Saving taste profile to memory...' } });
  push(2000, { type: 'profile:done', data: { dimensions: 7 } });

  // === STAGE 3: Verdict (92s–150s) ===
  // Filter real verdict events and retime them
  const verdictEvents = realEvents.filter(e =>
    e.type.startsWith('verdict:') || e.type === 'complete' || e.type === 'status'
  );

  const verdictOriginalStart = verdictEvents[0]?._ms ?? 0;
  const verdictOriginalEnd = verdictEvents[verdictEvents.length - 1]?._ms ?? 51000;
  const verdictOriginalDuration = verdictOriginalEnd - verdictOriginalStart;
  const verdictTargetDuration = VERDICT_END_MS - VERDICT_START_MS;

  ms = VERDICT_START_MS;
  for (const e of verdictEvents) {
    const normalizedT = (e._ms - verdictOriginalStart) / verdictOriginalDuration;
    const targetMs = VERDICT_START_MS + Math.round(normalizedT * verdictTargetDuration);
    const { _ms, ...event } = e;
    timeline.push({ ...event, _ms: targetMs });
  }

  timeline.sort((a, b) => a._ms - b._ms);

  await writeFile(OUTPUT_PATH, JSON.stringify(timeline, null, 2));
  console.log(`Generated ${timeline.length} demo events spanning ${timeline[timeline.length - 1]._ms}ms`);
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch(console.error);
