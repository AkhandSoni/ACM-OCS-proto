import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = (file) => ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const model = {};
vm.runInNewContext(compile('src/content.ts'), { exports: model });
class Context {
  _font = '10px sans-serif';
  get font() { return this._font; }
  set font(value) {
    assert.match(value, /^(?:(?:italic|bold|normal|[1-9]00)\s+)*\d+(?:\.\d+)?px\s+.+$/, 'Canvas fonts must put weight and style before the pixel size');
    this._font = value;
  }
  labels = [];
  images = [];
  colors = new Set();
  stack = [];
  save() { this.stack.push(this.font); }
  restore() { this.font = this.stack.pop(); }
  fillText(value, x, y) { this.labels.push({ value, x, y, font: this.font }); }
  measureText(value) { return { width: value.length * Number(this.font.match(/(\d+(?:\.\d+)?)px/)[1]) * .5 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  fillRect() {} strokeRect() {} beginPath() {} closePath() {} moveTo() {} lineTo() {} stroke() { this.colors.add(this.strokeStyle); } fill() { this.colors.add(this.fillStyle); } arc() {} roundRect() {} bezierCurveTo() {} drawImage(image) { this.images.push(image.src); } translate() {} scale() {} rect() {} clip() {}
}
const artwork = {};
vm.runInNewContext(compile('src/artwork.ts'), {
  exports: artwork,
  require: () => model,
  Image: class { naturalWidth = 1024; naturalHeight = 1536; async decode() {} },
  document: { createElement() { const context = new Context(); return { width: 0, height: 0, getContext: () => context }; } },
});
assert.equal(new Set(artwork.stickFigureColors).size, 5, 'Each domain must have a different stick figure color');
for (const spread of model.spreads) {
  for (const id of [spread.left, spread.right]) {
    const canvas = artwork.makePageCanvas(id);
    assert.equal(canvas.width, 1024); assert.equal(canvas.height, 1400);
    for (const item of canvas.getContext().labels) assert.ok(item.y >= 0 && item.y <= 1400, `${id}: visible text must stay on its sheet`);
  }
}
const draft = { name: 'Ada Example', registration: '24EX001', email: 'ada@vitstudent.ac.in', year: '2nd year', why: 'I like building things', experience: 'I made a study planner', contribute: 'A better campus tool', portfolio: 'https://example.com' };
const cover = artwork.makePageCanvas('cover', false, 'FRONT', draft);
const title = cover.getContext().labels.find((item) => item.value === 'SKETCHBOOK');
assert.equal(title.font, '700 78px Georgia, serif', 'The cover title must retain its full bold size');
const coverLabels = cover.getContext().labels.map((label) => label.value).join('\n');
for (const key of ['name', 'registration', 'email', 'year']) assert.ok(coverLabels.includes(draft[key]), `Shared ${key} must appear on the cover`);
for (const [index, domain] of model.domains.entries()) {
  const canvas = artwork.makePageCanvas(`${domain.id}-form`, false, 'FRONT', draft);
  const labels = canvas.getContext().labels.map((label) => label.value).join('\n');
  for (const key of ['why', 'experience', 'contribute', 'portfolio']) assert.ok(labels.includes(draft[key]), `${domain.name}: saved ${key} must appear before expanding the form`);
  for (const label of ['FULL NAME', 'REGISTRATION NUMBER', 'VIT EMAIL', 'YEAR OF STUDY']) assert.ok(!labels.includes(label), `${domain.name} must not repeat the cover profile fields`);
  assert.ok(labels.includes(`Why ${domain.name}?`));
  assert.ok(labels.includes(domain.prompts[0])); assert.ok(labels.includes(domain.prompts[1]));
  const story = artwork.makePageCanvas(`${domain.id}-story`);
  assert.ok(story.getContext().colors.has(artwork.stickFigureColors[index]), 'Each domain must show its assigned colorful stick figure');
  assert.equal(story.getContext().images.length, 0, 'Old cartoon images must not be drawn');
}
const finale = artwork.makePageCanvas('final-art');
for (const color of artwork.stickFigureColors) assert.ok(finale.getContext().colors.has(color), 'The finale must contain all five stick figure colors');
const summary = artwork.makePageCanvas('final-summary', false, 'FRONT', { summaries: [{ name: 'Tech', status: 'Draft saved on this device' }] });
assert.ok(summary.getContext().labels.some((item) => item.value === 'Draft saved on this device'), 'Saved drafts must be visible on the finale page');
console.log(`Verified all ${model.spreads.length * 2} page canvases, colorful stick figures, shared cover details, domain answers, and finale draft status.`);
