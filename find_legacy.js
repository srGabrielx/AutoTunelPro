import fs from 'fs';
import path from 'path';

const legacyFiles = [
  'lib/core/state.ts',
  'lib/core/seed-manager.ts',
  'lib/core/generation-identity.ts',
  'lib/director/command-bus.ts',
  'lib/director/orchestrator.ts',
  'lib/director/generation-planner.ts',
  'lib/engines/melody.ts',
  'lib/engines/drums.ts',
  'lib/engines/bass.ts',
  'lib/engines/arrangement.ts',
  'lib/engines/variation.ts',
  'lib/engines/validate.ts',
  'lib/engines/melody-context.ts',
  'lib/engines/melody-pipeline.ts',
  'lib/music/composition-plan.ts',
  'lib/music/styles.ts',
  'lib/music/synthesis-presets.ts'
].map(p => p.replace(/\.ts$/, ''));

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory() && file !== 'node_modules') {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.mjs')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = walk('./lib').concat(walk('./tests'));

console.log('--- Legacy Reference Map ---');
for (const legacy of legacyFiles) {
  const references = [];
  const name = path.basename(legacy);
  for (const f of allFiles) {
    if (f.replace(/\\/g, '/').includes(legacy)) continue; // skip self
    const content = fs.readFileSync(f, 'utf8');
    // Check if imported
    if (content.includes(`/${name}`) || content.includes(`'${name}'`) || content.includes(`"${name}"`)) {
      // Further filter: only match exact filename without /index
      const importRegex = new RegExp(`['"\`].*?/${name}['"\`]`, 'g');
      if (importRegex.test(content)) {
         references.push(f);
      }
    }
  }
  
  if (references.length > 0) {
    console.log(`\nLEGACY: ${legacy}.ts`);
    for (const ref of references) {
      console.log(`  <- ${ref}`);
    }
  } else {
    console.log(`\nDEAD: ${legacy}.ts`);
  }
}
