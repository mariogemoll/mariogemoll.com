import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PageData } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const contentDir = resolve(__dirname, '../../..', 'content');
const contentTsvPath = resolve(contentDir, 'content.tsv');

// Read content.tsv to get all page IDs
const contentTsv = readFileSync(contentTsvPath, 'utf8');
const lines = contentTsv.split('\n').filter(line => line.trim());
const pageIds = lines.slice(1).map(line => line.split('\t')[0]).filter(Boolean);

let allValid = true;

for (const pageId of pageIds) {
  const jsonPath = resolve(contentDir, `${pageId}.json`);

  try {
    const json: unknown = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const res = PageData.safeParse(json);

    if (!res.success) {
      console.error(`[FAIL] ${pageId}.json validation failed:`);
      for (const issue of res.error.issues) {
        console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      allValid = false;
    } else {
      const count = res.data.references.length;
      console.log(
        `[OK] ${pageId}.json valid & alphabetically sorted (${count.toString()} entries).`
      );
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`[SKIP] ${pageId}.json not found (skipping)`);
    } else {
      console.error(`[FAIL] ${pageId}.json: ${(err as Error).message}`);
      allValid = false;
    }
  }
}

if (!allValid) {
  process.exit(1);
}

console.log('\n[OK] All page JSONs are valid!');
