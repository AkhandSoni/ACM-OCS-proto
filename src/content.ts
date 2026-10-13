export type Domain = {
  id: string;
  name: string;
  theme: string;
  short: string;
  prompts: [string, string];
};

export const domains: Domain[] = [
  { id: 'tech', name: 'Tech', theme: 'Give the idea a brain', short: 'Build software, systems, and tools that turn ideas into working things.', prompts: ['What have you built or learned?', 'What would you like to build with ACM-VIT?'] },
  { id: 'research', name: 'Research', theme: 'Teach it to understand', short: 'Ask better questions, test assumptions, and learn from evidence.', prompts: ['What topic keeps you curious?', 'What would you like to investigate?'] },
  { id: 'management', name: 'Management', theme: 'Make the idea possible', short: 'Bring people together and turn ambitious plans into shared progress.', prompts: ['What have you organized or coordinated?', 'How do you respond when plans change?'] },
  { id: 'design', name: 'Design', theme: 'Give the idea an identity', short: 'Shape thoughtful interfaces, expressive visuals, and clear stories.', prompts: ['Which design work are you proud of?', 'What makes an experience memorable?'] },
  { id: 'cc', name: 'CC', theme: 'Think. Solve. Optimize.', short: 'Competitive Coding: explore algorithms, data structures, and timed problem solving.', prompts: ['Which coding platforms or contests have you tried?', 'Describe a problem you solved and your approach.'] },
];

export type Spread = { id: string; left: string; right: string; title: string };
export const spreads: Spread[] = [
  { id: 'cover', left: 'inside', right: 'cover', title: 'The Sketchbook Issue' },
  { id: 'discover', left: 'paths', right: 'index', title: 'Find your panel' },
  ...domains.map((d) => ({ id: d.id, left: `${d.id}-story`, right: `${d.id}-form`, title: d.name })),
  { id: 'final', left: 'final-art', right: 'final-summary', title: 'Join the story' },
  { id: 'back-cover', left: 'back-cover', right: 'back-inside', title: 'The back cover' },
];

export const turningLeaves = spreads.slice(0, -1).map((spread, sheetIndex) => ({
  sheetIndex,
  from: spread.id,
  to: spreads[sheetIndex + 1].id,
  front: spread.right,
  reverse: spreads[sheetIndex + 1].left,
}));

export function assertSpreadModel(): void {
  if (domains.map((d) => d.name).join(',') !== 'Tech,Research,Management,Design,CC') throw new Error('Domain order is not deterministic');
  if (spreads.length !== 9 || spreads[0].id !== 'cover' || spreads.at(-2)?.id !== 'final' || spreads.at(-1)?.id !== 'back-cover') throw new Error('Unexpected spread sequence');
  if (new Set(spreads.map((s) => s.id)).size !== spreads.length) throw new Error('Spread ids must be unique');
  for (let i = 0; i < spreads.length - 1; i++) {
    if (spreads[i].left === spreads[i].right || spreads[i + 1].left === spreads[i + 1].right) throw new Error('A spread cannot repeat a face');
    const leaf = turningLeaves[i];
    if (leaf.sheetIndex !== i || leaf.from !== spreads[i].id || leaf.to !== spreads[i + 1].id || leaf.front !== spreads[i].right || leaf.reverse !== spreads[i + 1].left) throw new Error(`Incorrect face mapping for sheet ${i}`);
  }
  if (domains.some((d, i) => spreads[i + 2]?.id !== d.id)) throw new Error('Domain chapters must follow the requested order');
}
