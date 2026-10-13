import { domains } from './content';

export const PAGE_W = 1024;
export const PAGE_H = 1400;
export type PageDraft = Partial<Record<'name' | 'registration' | 'email' | 'year' | 'why' | 'experience' | 'contribute' | 'portfolio', string>> & { summaries?: { name: string; status: string }[] };
type Ctx = CanvasRenderingContext2D;
const paper = '#f5efdf';
const ink = '#252521';
const graphite = '#514c43';
const accent = '#8a493e';
export const stickFigureColors = ['#257bc0', '#8857b8', '#d39424', '#d04f72', '#259276'] as const;
function canvasFont(size: number, font: string) {
  const modifiers = font.match(/^(?:(?:italic|bold|normal|[1-9]00)\s+)+/)?.[0] || '';
  return `${modifiers}${size}px ${font.slice(modifiers.length)}`;
}
function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function text(c: Ctx, value: string, x: number, y: number, size = 30, color = ink, font = 'Georgia, serif', align: CanvasTextAlign = 'left') {
  c.save(); c.fillStyle = color; c.font = canvasFont(size, font); c.textAlign = align; c.fillText(value, x, y); c.restore();
}
function wrapped(c: Ctx, value: string, x: number, y: number, width: number, size = 28, color = graphite, maxLines = 5, font = 'Georgia, serif') {
  c.save(); c.fillStyle = color; c.font = canvasFont(size, font); c.textAlign = 'left';
  const words = value.replace(/\s+/g, ' ').trim().split(' '); const lines: string[] = []; let row = '';
  for (const word of words) {
    if (c.measureText(row ? `${row} ${word}` : word).width > width && row) { lines.push(row); row = word; }
    else row = row ? `${row} ${word}` : word;
  }
  if (row) lines.push(row);
  lines.slice(0, maxLines).forEach((s, i) => {
    let line = i === maxLines - 1 && lines.length > maxLines ? `${s}…` : s;
    while (c.measureText(line).width > width && line.length > 1) line = `${line.slice(0, -2)}…`;
    c.fillText(line, x, y + i * size * 1.4);
  });
  c.restore(); return Math.min(lines.length, maxLines) * size * 1.4;
}
function pencil(c: Ctx, points: [number, number][], width = 2, color = ink) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = color;
  const rnd = seeded(Math.floor(points[0][0] + points[0][1]));
  for (let pass = 0; pass < 3; pass++) {
    c.globalAlpha = pass === 0 ? .8 : .18; c.lineWidth = pass === 0 ? width : .9;
    c.beginPath(); points.forEach(([x, y], i) => { const dx = pass ? (rnd() - .5) * 3 : 0, dy = pass ? (rnd() - .5) * 3 : 0; if (i) c.lineTo(x + dx, y + dy); else c.moveTo(x + dx, y + dy); }); c.stroke();
  }
  c.restore();
}
function frame(c: Ctx, x: number, y: number, w: number, h: number) {
  pencil(c, [[x, y + 3], [x + w - 2, y], [x + w, y + h], [x + 2, y + h + 2], [x, y + 3]], 2.4);
}
function stickFigure(c: Ctx, x: number, y: number, color: string, scale = 1, pose = 0) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // Colored pencil strokes keep the little figures loose and simple.
  pencil(c, [[0, -66], [0, 72]], 13, color);
  pencil(c, [[0, 72], [-23, 115], [-41, 158]], 11, color);
  pencil(c, [[0, 72], [28, 113], [42, 158]], 11, color);
  const left: [number, number][] = pose === 0 || pose === 5 ? [[0, -30], [-33, -59], [-58, -105]] : [[0, -30], [-34, -2], [-60, 15]];
  const right: [number, number][] = pose === 2 ? [[0, -30], [38, -53], [23, -90]] : pose === 5 ? [[0, -30], [37, -71], [59, -106]] : [[0, -30], [35, -4], [65, -24]];
  pencil(c, left, 10, color); pencil(c, right, 10, color);
  pencil(c, [[-42, 158], [-58, 161]], 8, graphite); pencil(c, [[42, 158], [58, 160]], 8, graphite);
  c.beginPath(); c.arc(0, -108, 34, 0, Math.PI * 2); c.fillStyle = '#faf7ed'; c.fill(); c.lineWidth = 4; c.strokeStyle = color; c.stroke();
  c.fillStyle = ink;
  for (const eye of [-12, 12]) { c.beginPath(); c.arc(eye, -113, 2.8, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.arc(0, -106, 15, Math.PI * .16, Math.PI * .84); c.strokeStyle = graphite; c.lineWidth = 2; c.stroke();
  c.restore();
}
function drawing(c: Ctx, cell: number, x: number, y: number, w: number, h = w) {
  c.save(); const scale = Math.min(w / 620, h / 500);
  c.translate(x + (w - 620 * scale) / 2, y + (h - 500 * scale) / 2); c.scale(scale, scale);
  pencil(c, [[57, 451], [564, 454]], 1, '#8b8476');
  if (cell === 6) {
    stickFigureColors.forEach((color, i) => stickFigure(c, 82 + i * 114, 282 - (i % 2) * 15, color, .83, i % 2 ? 5 : 0));
  } else if (cell === 0) {
    stickFigure(c, 212, 267, stickFigureColors[0], 1, 0);
    stickFigure(c, 425, 281, stickFigureColors[4], .94, 5);
    pencil(c, [[291, 183], [307, 165], [326, 187]], 2.5, stickFigureColors[3]);
  } else {
    const index = (cell - 1) % stickFigureColors.length;
    stickFigure(c, 225, 266, stickFigureColors[index], 1.05, cell);
    if (cell === 1) {
      frame(c, 349, 257, 150, 99);
      pencil(c, [[367, 282], [388, 300], [368, 317]], 3, stickFigureColors[0]);
      pencil(c, [[403, 317], [433, 317]], 2, stickFigureColors[0]);
      pencil(c, [[333, 369], [507, 369]], 5, graphite);
    } else if (cell === 2) {
      text(c, '?', 421, 241, 62, stickFigureColors[1], 'Georgia, serif');
      pencil(c, [[356, 369], [379, 340], [417, 348], [448, 298], [480, 304]], 3, stickFigureColors[1]);
    } else if (cell === 3) {
      stickFigure(c, 447, 310, stickFigureColors[0], .75, 0);
      frame(c, 315, 163, 177, 83);
      pencil(c, [[334, 184], [374, 184], [374, 220], [466, 220]], 2.5, stickFigureColors[2]);
    } else if (cell === 4) {
      pencil(c, [[411, 200], [346, 443]], 4); pencil(c, [[430, 200], [508, 443]], 4);
      frame(c, 351, 215, 153, 134);
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(380 + i * 44, 280, 12, 0, Math.PI * 2); c.fillStyle = stickFigureColors[i + 1]; c.fill(); }
    } else {
      stickFigure(c, 430, 313, stickFigureColors[3], .75, 0);
      frame(c, 322, 111, 211, 118);
      text(c, 'O(n)', 345, 158, 31, stickFigureColors[4], 'monospace');
      text(c, 'ACCEPTED', 345, 202, 24, graphite, 'monospace');
      pencil(c, [[479, 149], [491, 164], [516, 134]], 4, stickFigureColors[4]);
    }
  }
  c.restore();
}
function bubble(c: Ctx, value: string, x: number, y: number, w: number, h = 88) {
  c.save(); c.fillStyle = paper; c.beginPath(); c.roundRect(x, y, w, h, 22); c.fill(); c.strokeStyle = graphite; c.lineWidth = 2; c.stroke();
  pencil(c, [[x + w * .6, y + h], [x + w * .58, y + h + 24], [x + w * .7, y + h]], 1.5);
  wrapped(c, value, x + 20, y + 35, w - 40, 27, ink, 2, 'italic Georgia, serif'); c.restore();
}
function base(id: string) {
  const canvas = document.createElement('canvas'); canvas.width = PAGE_W; canvas.height = PAGE_H;
  const c = canvas.getContext('2d')!; c.fillStyle = paper; c.fillRect(0, 0, PAGE_W, PAGE_H);
  const rnd = seeded(id.split('').reduce((a, x) => a + x.charCodeAt(0), 42));
  for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(70,58,42,${rnd() * .035})`; c.fillRect(rnd() * PAGE_W, rnd() * PAGE_H, .5 + rnd() * 1.5, .5 + rnd() * 1.5); }
  const leftPage = id === 'inside' || id === 'paths' || id === 'final-art' || id.endsWith('-story');
  const gutter = c.createLinearGradient(leftPage ? PAGE_W : 0, 0, leftPage ? PAGE_W - 60 : 60, 0);
  gutter.addColorStop(0, '#4c41362b'); gutter.addColorStop(1, '#4c413600'); c.fillStyle = gutter; c.fillRect(leftPage ? PAGE_W - 60 : 0, 0, 60, PAGE_H);
  if (id !== 'cover' && id !== 'back-cover') {
    const idx = domains.findIndex((d) => id.startsWith(`${d.id}-`));
    const page = idx >= 0 ? 5 + idx * 2 + (id.endsWith('-form') ? 1 : 0) : ({ inside: 2, paths: 3, index: 4, 'final-art': 15, 'final-summary': 16, 'back-inside': 17 } as Record<string, number>)[id];
    text(c, 'ACM — VIT  /  THE SKETCHBOOK ISSUE', 88, 1330, 17, graphite, 'monospace');
    text(c, String(page || '').padStart(2, '0'), 930, 1330, 23, graphite, 'Georgia, serif', 'right');
  }
  return { canvas, c };
}
function heading(c: Ctx, kicker: string, title: string, subtitle?: string) {
  text(c, kicker.toUpperCase(), 88, 100, 20, accent, 'monospace');
  c.font = '700 58px Georgia, serif'; let size = 58;
  while (c.measureText(title).width > 840 && size > 34) { size--; c.font = `700 ${size}px Georgia, serif`; }
  text(c, title, 88, 178, size, ink, '700 Georgia, serif');
  pencil(c, [[88, 206], [465, 203], [936, 207]], 1.5, graphite);
  if (subtitle) wrapped(c, subtitle, 88, 253, 830, 27, graphite, 2);
}
function clothCover(c: Ctx) {
  const gold = '#eddfb7';
  c.fillStyle = '#233b4a'; c.fillRect(0, 0, PAGE_W, PAGE_H);
  for (let x = 0; x < PAGE_W; x += 5) { c.fillStyle = x % 10 ? '#ffffff08' : '#0000000d'; c.fillRect(x, 0, 1, PAGE_H); }
  for (let y = 0; y < PAGE_H; y += 5) { c.fillStyle = y % 10 ? '#ffffff08' : '#0000000d'; c.fillRect(0, y, PAGE_W, 1); }
  c.fillStyle = '#182b37'; c.fillRect(0, 0, 71, PAGE_H);
  c.fillStyle = '#101e2966'; c.fillRect(71, 0, 8, PAGE_H);
  c.strokeStyle = '#d8c596'; c.lineWidth = 3; c.strokeRect(109, 58, 862, 1274);
  c.lineWidth = 1; c.strokeRect(123, 72, 834, 1246);
  return gold;
}
function cover(c: Ctx, draft: PageDraft) {
  const gold = clothCover(c);
  text(c, 'ACM — VIT', 539, 166, 37, gold, '700 Georgia, serif', 'center');
  text(c, 'THE', 539, 301, 48, gold, 'Georgia, serif', 'center');
  text(c, 'SKETCHBOOK', 539, 414, 78, gold, '700 Georgia, serif', 'center');
  text(c, 'ISSUE', 539, 493, 61, gold, 'Georgia, serif', 'center');
  c.fillStyle = '#d8c596'; c.fillRect(361, 535, 354, 2);
  c.fillStyle = '#152632'; c.fillRect(189, 594, 718, 563);
  c.fillStyle = paper; c.fillRect(177, 581, 718, 563);
  c.strokeStyle = '#c5b694'; c.lineWidth = 5; c.strokeRect(177, 581, 718, 563);
  text(c, 'THIS BOOK BELONGS TO', 212, 636, 24, graphite, 'monospace');
  text(c, 'Your details, once for every chapter.', 212, 677, 22, graphite, 'italic Georgia, serif');
  drawing(c, 0, 690, 601, 178, 127);
  const field = (label: string, value: string | undefined, placeholder: string, x: number, y: number, w: number) => {
    text(c, label.toUpperCase(), x, y, 22, graphite, 'monospace');
    wrapped(c, value || placeholder, x, y + 38, w - 10, 28, value ? ink : graphite, 1, value ? 'Georgia, serif' : 'italic Georgia, serif');
    pencil(c, [[x, y + 56], [x + w, y + 56]], 1, '#948a77');
  };
  field('Full name', draft.name, 'Your full name…', 212, 738, 634);
  field('Registration number', draft.registration, 'Your registration…', 212, 848, 307);
  field('Year of study', draft.year, 'Choose your year…', 558, 848, 288);
  field('VIT email', draft.email, 'you@vitstudent.ac.in', 212, 958, 634);
  c.fillStyle = '#344c5b'; c.fillRect(212, 1052, 634, 55);
  text(c, draft.name ? 'EDIT YOUR SHARED DETAILS  ↗' : 'CLICK TO ADD YOUR DETAILS  ↗', 529, 1088, 21, '#fff9ed', 'monospace', 'center');
  text(c, 'Because Technology Matters', 539, 1215, 28, gold, 'italic Georgia, serif', 'center');
  text(c, 'RECRUITMENT  ·  2026', 539, 1278, 23, '#dbc89e', 'monospace', 'center');
}
function backCover(c: Ctx) {
  const gold = clothCover(c);
  text(c, 'ACM — VIT', 539, 169, 39, gold, '700 Georgia, serif', 'center');
  text(c, 'TO BE', 539, 315, 48, gold, 'Georgia, serif', 'center');
  text(c, 'CONTINUED…', 539, 418, 67, gold, '700 Georgia, serif', 'center');
  c.fillStyle = '#d8c596'; c.fillRect(362, 467, 353, 2);
  c.fillStyle = paper; c.fillRect(177, 535, 718, 379);
  c.strokeStyle = '#c5b694'; c.lineWidth = 5; c.strokeRect(177, 535, 718, 379);
  drawing(c, 6, 194, 553, 684, 342);
  wrapped(c, 'Five chapters. A colorful cast. One place for your next idea.', 202, 998, 665, 31, gold, 3);
  text(c, 'Because Technology Matters', 539, 1193, 29, gold, 'italic Georgia, serif', 'center');
  text(c, 'THE SKETCHBOOK ISSUE  ·  2026', 539, 1278, 22, '#dbc89e', 'monospace', 'center');
}
function story(c: Ctx, index: number) {
  const d = domains[index];
  heading(c, `Chapter 0${index + 1} / ${d.id === 'cc' ? 'CC · Competitive Coding' : d.name}`, d.theme, d.short);
  frame(c, 88, 326, 848, 625); drawing(c, index + 1, 115, 479, 795, 451);
  const sayings = ['Okay… let’s see if this works.', 'Wait. What if we ask a better question?', 'Good ideas need good people.', 'It needs a little personality.', 'Accepted! On to the next problem.'];
  bubble(c, sayings[index], 141, 351, index === 1 ? 600 : 500, 92);
  frame(c, 88, 978, 390, 258); frame(c, 502, 978, 434, 258);
  drawing(c, 0, 106, 999, 240, 218);
  text(c, 'A SMALL START.', 331, 1030, 17, accent, 'monospace', 'center');
  drawing(c, index + 1, 529, 998, 210, 218);
  wrapped(c, ['Build. Break. Learn. Repeat.', 'Ask. Test. Learn.', 'Plan. Share. Make.', 'Form. Feel. Refine.', 'Think. Solve. Optimize.'][index], 756, 1054, 158, 24, ink, 4);
  text(c, 'Your part in the story continues on the next page →', 88, 1280, 22, graphite, 'italic Georgia, serif');
}
function application(c: Ctx, index: number, draft: PageDraft) {
  const d = domains[index];
  heading(c, `${d.id === 'cc' ? 'CC · Competitive Coding' : d.name} / Your application`, 'Your next panel.', 'Your cover holds your profile. This page is just about your ideas.');
  frame(c, 88, 320, 848, 103);
  text(c, 'YOUR DETAILS LIVE ON THE COVER', 112, 356, 21, graphite, 'monospace');
  wrapped(c, draft.name ? `Applying as ${draft.name}` : 'Fill in your cover profile once for every domain.', 112, 393, 794, 27, ink, 1);
  const question = (label: string, value: string | undefined, y: number) => {
    wrapped(c, label, 88, y, 825, 27, ink, 2, '700 Georgia, serif');
    wrapped(c, value || 'Your answer goes here. Click the page to write.', 88, y + 65, 822, 27, value ? ink : '#655f55', 3, value ? 'Georgia, serif' : 'italic Georgia, serif');
    pencil(c, [[88, y + 164], [936, y + 164]], 1, '#948a77');
  };
  question(`Why ${d.name}?`, draft.why, 474);
  question(d.prompts[0], draft.experience, 684);
  question(d.prompts[1], draft.contribute, 894);
  wrapped(c, `Portfolio (optional): ${draft.portfolio || 'a link to something you made'}`, 88, 1084, 840, 22, graphite, 1);
  c.fillStyle = '#344c5b'; c.fillRect(88, 1115, 848, 82);
  const hasAnswers = !!(draft.why || draft.experience || draft.contribute || draft.portfolio);
  text(c, hasAnswers ? 'CONTINUE YOUR APPLICATION  ↗' : 'CLICK THIS PAGE TO WRITE YOUR STORY  ↗', 512, 1165, 24, '#fff9ed', 'monospace', 'center');
  wrapped(c, hasAnswers ? 'Draft saved on this device. Click to expand and edit.' : 'Your answers save on this device as you write.', 88, 1245, 840, 24, graphite, 1);
}
function artPage(id: string, draft: PageDraft) {
  const { canvas, c } = base(id);
  if (id === 'cover') { cover(c, draft); return canvas; }
  if (id === 'back-cover') { backCover(c); return canvas; }
  if (id === 'back-inside') { heading(c, 'The last page', 'Until next time.'); drawing(c, 6, 120, 430, 784, 650); return canvas; }
  const index = domains.findIndex((d) => id.startsWith(`${d.id}-`));
  if (id.endsWith('-form') && index >= 0) { application(c, index, draft); return canvas; }
  if (id.endsWith('-story') && index >= 0) { story(c, index); return canvas; }
  if (id === 'index') {
    heading(c, 'The contents', 'Find your chapter.', 'Five ways to help one small idea grow. Click a chapter to begin.');
    domains.forEach((d, i) => {
      const y = 355 + i * 166;
      text(c, `0${i + 1}`, 88, y, 39, accent, 'Georgia, serif');
      text(c, d.name, 175, y, 43, ink, '700 Georgia, serif');
      text(c, `0${5 + i * 2}`, 918, y, 30, graphite, 'Georgia, serif', 'right');
      wrapped(c, d.short, 175, y + 48, 720, 27, graphite, 2);
      pencil(c, [[88, y + 105], [935, y + 106]], 1, '#948a77');
    });
    text(c, 'One story. Every kind of thinker.', 88, 1260, 31, ink, 'italic Georgia, serif');
    return canvas;
  }
  if (id === 'inside' || id === 'paths') {
    heading(c, 'The beginning', 'What if…?', 'It started with a blank page. And a very small idea.');
    frame(c, 88, 327, 848, 685); drawing(c, 0, 106, 479, 813, 497);
    bubble(c, 'I wonder what we could make together.', 123, 354, 620, 91);
    frame(c, 88, 1040, 848, 195);
    wrapped(c, 'A blank page, a few colorful friends, and five ways to build something together. Pick a chapter and add your part to the story.', 115, 1089, 790, 31, ink, 3);
    text(c, 'Turn the page. Find your part in the story.', 88, 1280, 24, accent, 'italic Georgia, serif');
    return canvas;
  }
  if (id === 'final-art') {
    heading(c, 'The final panel', 'Look what we made.', 'An idea becomes a story when we build it together.');
    frame(c, 88, 326, 848, 848); drawing(c, 6, 109, 480, 806, 670);
    bubble(c, 'This is only the beginning.', 195, 348, 530, 88);
    text(c, 'Every great idea starts with a scribble.', 512, 1254, 35, ink, 'italic Georgia, serif', 'center');
    return canvas;
  }
  heading(c, 'To be continued', 'Join the story.', 'Your next chapter could start right here.');
  drawing(c, 6, 125, 305, 774, 380);
  const summaries = draft.summaries || [];
  if (summaries.length) summaries.forEach((entry, i) => {
    const y = 740 + i * 69;
    text(c, entry.name, 115, y, 29, ink, '700 Georgia, serif');
    text(c, entry.status, 900, y, 23, graphite, 'Georgia, serif', 'right');
    pencil(c, [[115, y + 22], [900, y + 22]], 1, '#948a77');
  });
  else wrapped(c, 'Your saved applications will appear here. Pick a chapter and tell us where you want to begin.', 130, 784, 760, 32, ink, 3);
  frame(c, 88, 1116, 848, 114);
  text(c, 'YOUR APPLICATION NOTEBOOK  ↗', 512, 1162, 29, ink, '700 Georgia, serif', 'center');
  text(c, 'Click to review, export, or delete your drafts.', 512, 1205, 24, graphite, 'Georgia, serif', 'center');
  text(c, 'A local sketchbook. Your ideas stay on this device.', 88, 1272, 24, graphite, 'italic Georgia, serif');
  return canvas;
}
export function makePageCanvas(id: string, debug = false, face: 'FRONT' | 'REVERSE' = 'FRONT', draft: PageDraft = {}): HTMLCanvasElement {
  const canvas = artPage(id, draft);
  if (debug) {
    const c = canvas.getContext('2d')!; c.fillStyle = accent; c.fillRect(80, 10, 560, 42);
    text(c, `${face} / ${id.toUpperCase()}`, 95, 39, 22, '#fff9ed', 'monospace');
  }
  return canvas;
}
export function makeDeskTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
  const c = canvas.getContext('2d')!; const rnd = seeded(91);
  c.fillStyle = '#c8b99b'; c.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 10000; i++) { c.fillStyle = `rgba(65,48,28,${rnd() * .055})`; c.fillRect(rnd() * 1024, rnd() * 1024, 1 + rnd(), 1 + rnd()); }
  for (let i = 0; i < 440; i++) {
    const y = rnd() * 1024; c.strokeStyle = `rgba(78,58,35,${.018 + rnd() * .042})`; c.lineWidth = .4 + rnd() * 1.3;
    c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(270, y + rnd() * 20, 640, y - rnd() * 20, 1024, y); c.stroke();
  }
  return canvas;
}

export function makeClothTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!; c.fillStyle = '#888888'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {
    c.fillStyle = '#acacac'; c.fillRect(i, 0, 1, 256);
    c.fillStyle = '#636363'; c.fillRect(0, i + 2, 256, 1);
  }
  return canvas;
}
