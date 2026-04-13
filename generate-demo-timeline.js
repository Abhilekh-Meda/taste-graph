import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVENTS_PATH = resolve(__dirname, 'demo-data', 'events.json');
const OUTPUT_PATH = resolve(__dirname, 'demo-data', 'demo-timeline.json');

const PROFILE_MS = [0, 30_000];
const VERDICT_MS = [31_000, 55_000];

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

const DISCOVERY_MSGS = [
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

const ASPECT_MSGS = {
  stated_vs_actual: [
    "Extracting stated principles from essays and posts...",
    "web_search: Arlan stated values entrepreneurship first principles",
    "Completed: web_search",
    "Cross-referencing against documented reactions...",
    "Mapping gap between stated meritocracy and prestige signals...",
    "Compiling findings...",
  ],
  taste_drift: [
    "Analyzing early vs recent public statements...",
    "web_search: Arlan Rakhmetzhanov evolution views AI startups over time",
    "Completed: web_search",
    "Comparing 2023 posts to 2025 writing...",
    "Mapping temporal shifts in domain interest...",
    "Compiling findings...",
  ],
  blind_spots: [
    "Searching for documented misjudgments...",
    "web_search: Arlan Rakhmetzhanov wrong predictions errors",
    "Completed: web_search",
    "Analyzing systematic biases in endorsement patterns...",
    "Mapping error categories...",
    "Compiling findings...",
  ],
  influence_graph: [
    "Identifying intellectual influences...",
    "web_search: Arlan Rakhmetzhanov influences mentors Paul Graham Karpathy",
    "Completed: web_search",
    "Mapping influence topology: PG, Karpathy, YC culture...",
    "Tracing aesthetic lineage from Silicon Valley canon...",
    "Compiling findings...",
  ],
  contextual_variation: [
    "Analyzing how judgment shifts by stakes...",
    "web_search: Arlan Rakhmetzhanov hackathon vs investment judgment",
    "Completed: web_search",
    "Comparing hackathon praise patterns vs serious critique...",
    "Mapping context variance across scenarios...",
    "Compiling findings...",
  ],
  linguistic_tells: [
    "Indexing excitement and disapproval signals...",
    "web_search: Arlan Rakhmetzhanov writing style linguistic patterns",
    "Completed: web_search",
    "Mapping approval markers: hustle language, agency emphasis...",
    "Mapping disapproval markers: wrapper skepticism, low-agency signals...",
    "Compiling findings...",
  ],
  falsifiability: [
    "Building ground-truth dataset of known reactions...",
    "web_search: Arlan Rakhmetzhanov praised projects products documented reactions",
    "Completed: web_search",
    "Identifying testable reaction predictions...",
    "Computing estimated model accuracy...",
    "Compiling findings...",
  ],
};

function at(ms, event) { return { ...event, _ms: Math.round(ms) }; }

function spread(startMs, endMs, items) {
  const gap = (endMs - startMs) / items.length;
  return items.map((item, i) => ({ ...item, _ms: Math.round(startMs + gap * i) }));
}

async function main() {
  const realEvents = JSON.parse(await readFile(EVENTS_PATH, 'utf8'));
  const timeline = [];

  // ── PROFILE PHASE: 0s–48s ──
  // Discovery: 0s–12s
  timeline.push(at(300, { type: 'profile:start', data: { person: 'Arlan Rakhmetzhanov' } }));

  const discoveryEvents = DISCOVERY_MSGS.map(msg => ({
    type: 'profile:discovery', data: { message: msg },
  }));
  timeline.push(...spread(800, 6_500, discoveryEvents));
  timeline.push(at(7_000, { type: 'profile:discovery_done', data: { sources_found: SOURCES.length, comparison: null } }));

  timeline.push(at(7_200, { type: 'profile:indexing', data: { count: SOURCES.length } }));
  const indexEvents = [];
  for (let i = 0; i < SOURCES.length; i++) {
    const t0 = 7_500 + (i / SOURCES.length) * 5000;
    const t1 = t0 + 200;
    indexEvents.push(at(t0, { type: 'profile:source_indexing', data: { url: SOURCES[i].url, type: SOURCES[i].type, index: i, total: SOURCES.length } }));
    indexEvents.push(at(t1, { type: 'profile:source_indexed', data: { url: SOURCES[i].url, type: SOURCES[i].type, indexed: i + 1, total: SOURCES.length } }));
  }
  timeline.push(...indexEvents);
  timeline.push(at(13_000, { type: 'profile:indexing_done', data: { indexed: SOURCES.length, failed: 0 } }));

  // Aspects: 22.5s–45s
  const aspectStart = 13_500;
  for (const a of ASPECTS) {
    timeline.push(at(aspectStart, { type: 'profile:aspect_start', data: { key: a.key, label: a.label } }));
  }

  const aspectKeys = Object.keys(ASPECT_MSGS);
  const msgsPerAspect = ASPECT_MSGS[aspectKeys[0]].length;
  const aspectProgressEnd = 24_000;
  const totalMsgSlots = aspectKeys.length * msgsPerAspect;
  let slot = 0;
  for (let msgIdx = 0; msgIdx < msgsPerAspect; msgIdx++) {
    for (const key of aspectKeys) {
      const msgs = ASPECT_MSGS[key];
      if (msgIdx >= msgs.length) continue;
      const t = aspectStart + 500 + ((aspectProgressEnd - aspectStart - 500) * slot) / totalMsgSlots;
      timeline.push(at(t, { type: 'profile:aspect_progress', data: { key, message: msgs[msgIdx] } }));
      slot++;
    }
  }

  // Complete aspects staggered 40s–45s
  const completionOrder = [
    'contextual_variation', 'blind_spots', 'linguistic_tells', 'falsifiability',
    'taste_drift', 'stated_vs_actual', 'influence_graph',
  ];
  completionOrder.forEach((key, i) => {
    const t = 24_500 + (i * 3000) / completionOrder.length;
    timeline.push(at(t, {
      type: 'profile:aspect_done',
      data: { key, label: ASPECTS.find(a => a.key === key).label },
    }));
  });

  timeline.push(at(28_000, { type: 'profile:saving', data: { message: 'Saving taste profile to memory...' } }));
  timeline.push(at(29_500, { type: 'profile:done', data: { dimensions: 7 } }));

  // ── VERDICT PHASE: 49s–90s ──
  const verdictEvents = realEvents.filter(e =>
    e.type.startsWith('verdict:') || e.type === 'complete' || e.type === 'status'
  );

  const vOrigStart = verdictEvents[0]?._ms ?? 0;
  const vOrigEnd = verdictEvents[verdictEvents.length - 1]?._ms ?? 51000;
  const vOrigDur = vOrigEnd - vOrigStart;
  const [vStart, vEnd] = VERDICT_MS;
  const vDur = vEnd - vStart;

  for (const e of verdictEvents) {
    const t = (e._ms - vOrigStart) / vOrigDur;
    const { _ms, ...event } = e;
    timeline.push(at(vStart + t * vDur, event));
  }

  timeline.sort((a, b) => a._ms - b._ms);

  await writeFile(OUTPUT_PATH, JSON.stringify(timeline, null, 2));

  const last = timeline[timeline.length - 1];
  const profileDone = timeline.find(e => e.type === 'profile:done');
  const verdictStart = timeline.find(e => e.type === 'verdict:ingesting');
  const complete = timeline.find(e => e.type === 'complete');
  console.log(`${timeline.length} events | profile:done @${profileDone._ms}ms | verdict:ingesting @${verdictStart._ms}ms | complete @${complete._ms}ms | last @${last._ms}ms`);
}

main().catch(console.error);
