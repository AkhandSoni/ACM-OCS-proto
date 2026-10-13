import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';

const modelExports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/content.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: modelExports });
const source = readFileSync('src/main.ts', 'utf8');
function getFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next).split('\nwindow.addEventListener')[0];
}
const names = ['alignRibbon', 'applySpread', 'beginTurn', 'updateCurl', 'finishTurn', 'goTo', 'animateNavigation'];
const functions = names.map(getFunction).join('\n') + '\n' + source.slice(source.indexOf('function frame('), source.indexOf('\nfunction resize('));
const code = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const controls = new Map();
const document = { querySelector(selector) { if (!controls.has(selector)) controls.set(selector, { hidden: false, disabled: false, style: {}, setAttribute() {} }); return controls.get(selector); }, querySelectorAll: () => [] };
function createContext() {
  const context = {
    THREE, document, ...modelExports, W: 4.05, H: 5.55, current: 0, turning: false, direction: 1, progress: 0, target: null, velocity: 0,
    overlay: { hidden: true }, readerOverlay: { hidden: true }, label: {}, leftHalf: new THREE.Group(), rightHalf: new THREE.Group(), ribbon: new THREE.Mesh(), book: new THREE.Group(),
    leftPage: new THREE.Mesh(undefined, new THREE.MeshStandardMaterial()), rightPage: new THREE.Mesh(undefined, new THREE.MeshStandardMaterial()),
    dynamic: new THREE.Mesh(undefined, [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()]), coverSlab: new THREE.Mesh(), coverMat: new THREE.MeshStandardMaterial(), clothMap: new THREE.Texture(),
    texture: (id, reverse) => `${id}${reverse ? ':reverse' : ''}`, trimTextureCache() {}, resize() {}, saveReadingState() {}, warmupTimer: 0, clearTimeout() {}, window: { setTimeout: () => 0 },
    clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), readingState: { lastSpread: 0, bookmark: null }, enteredBook: false,
    mobileSide: 1, navigationTarget: null, quickNavigation: false, pointerDown: false, innerWidth: 1440, reducedMotion: false,
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), cameraCenter: 2, cameraDistance: 16, desiredDistance: 16, previousFrame: 0,
    renderer: { render() {} }, requestAnimationFrame() {}, performance: { now: () => 0 },
  };
  vm.createContext(context);
  const start = source.indexOf('const geometry ='); const end = source.indexOf('const canvasCache', start);
  vm.runInContext(ts.transpileModule(source.slice(start, end) + '\nglobalThis.geometry = geometry;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const coverStart = source.indexOf('const coverSlabGeometry ='); const coverEnd = source.indexOf('// Warm the first transition', coverStart);
  vm.runInContext(ts.transpileModule(source.slice(coverStart, coverEnd) + '\nglobalThis.coverSlab = coverSlab;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  vm.runInContext(code, context);
  return context;
}
const c = createContext();
assert.equal(c.geometry.groups.length, 2, 'Both faces must have material groups to be rendered');
assert.deepEqual(c.geometry.groups.map((g) => g.materialIndex), [0, 1]);
for (const direction of [1, -1]) {
  c.direction = direction; c.current = direction === 1 ? 2 : 3;
  for (const progress of [0, .2, .5, .8, 1]) {
    c.progress = progress; c.updateCurl();
    const pos = c.geometry.attributes.position; const normal = c.geometry.attributes.normal;
    assert.ok(pos.getY(0) > 0, 'The top of the page must stay at the top of the UV texture');
    for (let i = 0; i < pos.count; i++) assert.ok(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i)), 'Sheet vertices must remain finite');
    let length = 0;
    for (let i = 1; i < 49; i++) length += Math.hypot(pos.getX(i) - pos.getX(i - 1), pos.getY(i) - pos.getY(i - 1), pos.getZ(i) - pos.getZ(i - 1));
    assert.ok(Math.abs(length - c.W) < .02, `The sheet must bend without stretching (${length})`);
    if (progress === .5) assert.ok(pos.getZ(48) > 3, 'The moving page must physically rise away from the book');
    if (progress === 0 || progress === 1) {
      const expectedSign = direction === 1 ? (progress === 0 ? 1 : -1) : (progress === 0 ? -1 : 1);
      assert.ok(normal.getZ(0) * expectedSign > .99, 'The correct face must point at the camera at either endpoint');
    }
  }
}
function settle(context, fps, goal) {
  const limit = Math.max(4, Math.abs(goal - context.current) * 3);
  for (let i = 1; i <= fps * limit; i++) { context.frame(context.previousFrame + 1000 / fps); if (!context.turning && context.current === goal) return i / fps; }
  assert.fail(`Turn did not settle at spread ${goal}`);
}
const durations = [];
for (const fps of [30, 60, 120]) {
  const context = createContext(); context.applySpread(0);
  assert.equal(context.leftHalf.visible, false, 'A closed book must have no resting page on its left');
  assert.equal(context.coverSlab.geometry.type, 'BoxGeometry', 'The hard cover must be a thick box rather than a paper plane');
  assert.ok(context.coverSlab.geometry.parameters.depth >= .14);
  assert.equal(context.rightPage.visible, false, 'The cover must replace the thin resting page');
  context.beginTurn(1);
  assert.equal(context.leftHalf.visible, false, 'Opening the cover must move the cover instead of exposing a duplicate left page');
  assert.equal(context.rightPage.material.map, modelExports.spreads[1].right, 'The next right page must be revealed under the leaf');
  durations.push(settle(context, fps, 1));
  assert.equal(context.leftHalf.visible, true);
  context.beginTurn(-1); settle(context, fps, 0);
  assert.equal(context.leftHalf.visible, false, 'Returning to the cover must hide the left page');
  assert.equal(context.dynamic.visible, false); assert.equal(context.coverSlab.visible, true);
  assert.equal(context.coverSlab.rotation.y, 0, 'The closed cover must settle flat on the right');
  const last = modelExports.spreads.length - 1;
  context.goTo(last, true); settle(context, fps, last);
  assert.equal(context.coverSlab.visible, true, 'The back cover must be a visible hard cover');
  assert.equal(context.coverSlab.rotation.y, -Math.PI, 'The back cover must close on the left');
  assert.equal(context.coverSlab.material[5].map, 'back-cover', 'The outside back cover must face the reader');
  assert.equal(context.rightHalf.visible, false, 'A closed back cover must not leave an extra page on its right');
  assert.equal(context.leftPage.visible, false);
  context.beginTurn(-1); settle(context, fps, last - 1);
  assert.equal(context.rightHalf.visible, true, 'Reopening the back cover must restore the spread');
}
assert.ok(Math.max(...durations) - Math.min(...durations) < .2, 'Motion must have consistent timing across frame rates');
const queue = createContext(); queue.goTo(2); queue.goTo(4); settle(queue, 60, 4);
assert.equal(queue.navigationTarget, null, 'A newer chapter choice must replace a queued destination');
queue.beginTurn(-1); queue.progress = .3; queue.target = 0; queue.velocity = 0; settle(queue, 60, 4);
assert.equal(queue.leftPage.material.map, modelExports.spreads[4].left, 'Cancelling a turn must restore its original pages');
const quickDurations = [];
for (const fps of [30, 60, 120]) {
  const quick = createContext(); const last = modelExports.spreads.length - 1; quick.goTo(last, true);
  quickDurations.push(settle(quick, fps, last));
  assert.equal(quick.quickNavigation, false, 'Chapter speed must reset after reaching the destination');
  quick.goTo(0, true); assert.ok(settle(quick, fps, 0) < 4.5, 'The return to the cover must remain faster than manual turns');
  assert.equal(quick.leftHalf.visible, false);
  quick.beginTurn(1); assert.ok(settle(quick, fps, 1) > .8, 'Manual turns must retain their normal pace after a chapter jump');
}
assert.ok(Math.min(...quickDurations) > 2, 'A chapter jump must leave enough time to see the sheets turning');
assert.ok(Math.max(...quickDurations) < 4.5, 'The whole book must reach a chapter faster than manual turns');
for (const fps of [30, 60, 120]) {
  const landing = createContext(); landing.goTo(1, true);
  const duration = settle(landing, fps, 1);
  assert.ok(duration > .5 && duration < 1.1, 'The destination sheet must visibly sweep across and settle');
}
const redirect = createContext(); redirect.goTo(7, true); redirect.frame(100); redirect.goTo(2, true); settle(redirect, 60, 2);
assert.equal(redirect.navigationTarget, null, 'A new choice during a fast jump must replace the previous destination');
console.log('Verified visible front/reverse sheets, fixed paper length, opening and closing, frame independent settling, queued navigation, and cancelled turns.');
