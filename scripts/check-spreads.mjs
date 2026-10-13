import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/content.ts', import.meta.url), 'utf8');
const compiled = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
const { assertSpreadModel, spreads, turningLeaves } = await import(moduleUrl);
assertSpreadModel();
if (turningLeaves.length !== 8 || turningLeaves[0].front !== 'cover' || turningLeaves[0].reverse !== 'paths' || turningLeaves.at(-1).to !== 'back-cover' || turningLeaves.at(-1).reverse !== 'back-cover') {
  throw new Error('Unexpected front-to-back cover leaf mapping');
}
console.log(`Verified ${spreads.length} spreads and ${turningLeaves.length} fixed front/reverse leaf mappings.`);
