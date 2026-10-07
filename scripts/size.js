import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT = 50 * 1024;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let total = 0;
for (const file of walk('dist')) {
  const gz = gzipSync(readFileSync(file)).length;
  total += gz;
  console.log(`${(gz / 1024).toFixed(2).padStart(7)} KB  ${file}`);
}
console.log(`${(total / 1024).toFixed(2).padStart(7)} KB  total (gzipped), limit 50 KB`);
if (total > LIMIT) process.exit(1);
