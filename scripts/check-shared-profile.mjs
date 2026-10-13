import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync('src/main.ts', 'utf8');
const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}
const keys = ['name', 'registration', 'email', 'year'];
const stored = new Map();
const context = {
  localStorage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
  storageKey: 'applications', profileKey: 'profile', profileFields: keys,
  domains: ['tech', 'research', 'management', 'design', 'cc'].map((id) => ({ id })),
  clearTimeout() {}, previewTimer: 0, profilePreviewTimer: 0, window: { setTimeout: () => 0 }, refreshProfilePages() {}, refreshApplicationPage() {}, show() {},
};
vm.createContext(context);
vm.runInContext(compile(['readStoredApplications', 'readAll', 'pickProfile', 'readProfile', 'profileComplete', 'persistProfile', 'persist'].map(extract).join('\n')), context);
assert.equal(context.profileComplete(), false);
const partial = { name: 'Old partial', why: 'Keep the tech answer' };
const complete = { name: 'Ada Example', registration: '24EX001', email: 'ada@vitstudent.ac.in', year: '2nd year', why: 'Keep the research answer' };
stored.set('applications', JSON.stringify({ tech: partial, research: complete }));
const migrated = context.readProfile();
for (const key of keys) assert.equal(migrated[key], complete[key], 'Migration must choose one coherent existing profile');
assert.equal(context.profileComplete(), true);
assert.equal(context.readAll().tech.why, partial.why, 'Migration must preserve domain answers');
assert.equal(context.readAll().research.why, complete.why);
const revised = { ...complete, name: 'Updated shared name' };
assert.equal(context.persistProfile(revised), true);
for (const id of ['tech', 'research', 'management', 'design', 'cc']) {
  assert.equal(context.persist(id, { why: `${id} answer`, experience: 'Experience', contribute: 'Idea', portfolio: '', submitted: false }), true);
  const combined = { ...context.readAll()[id], ...context.readProfile() };
  assert.equal(combined.name, revised.name, 'Every application must use the latest cover profile');
  for (const key of keys) assert.ok(!Object.hasOwn(context.readAll()[id], key), 'Personal fields must not be stored per domain');
}
context.persistProfile({ ...revised, email: '' });
assert.equal(context.readProfile().email, '', 'Clearing a profile field must not revive a legacy value');
assert.equal(context.profileComplete(), false);
const domainForm = extract('openForm'); const coverForm = extract('openProfile');
for (const key of keys) {
  assert.ok(coverForm.includes(`name="${key}"`), 'Cover must offer each shared field');
  assert.ok(!domainForm.includes(`name="${key}"`), 'Domain forms must not ask for the shared fields again');
}
assert.ok(coverForm.includes('<option>5th year</option>'), 'The year menu must include fifth year');
context.persistProfile({ ...revised, year: '5th year' });
assert.equal(context.profileComplete(), true, 'Fifth year must be accepted by the shared profile');
console.log('Verified shared profile migration, updates across all domains, preserved answers, no duplicate personal fields, and shared profile validation.');
