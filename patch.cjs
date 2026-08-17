const fs = require('fs');
['4','6','7','8'].forEach(n => {
  const p = './tests/architecture/lote' + n + '.test.ts';
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('getLegacyProfile')) {
    c = "import { getLegacyProfile } from '../../lib/director/context/resolver.ts';\n" + c;
  }
  c = c.replace(/preset:\{\} as any/g, "preset: getLegacyProfile('trap-br')");
  c = c.replace(/preset: \{\} as any/g, "preset: getLegacyProfile('trap-br')");
  fs.writeFileSync(p, c);
});
