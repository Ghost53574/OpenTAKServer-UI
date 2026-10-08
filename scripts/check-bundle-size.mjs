import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const chunkDirectory = fileURLToPath(new URL('../dist/assets/js/', import.meta.url));
const maxChunkBytes = 450 * 1024;
const oversizedChunks = [];

for (const fileName of await readdir(chunkDirectory)) {
  if (!fileName.endsWith('.js')) continue;

  const file = await stat(join(chunkDirectory, fileName));
  if (file.size > maxChunkBytes) {
    oversizedChunks.push(`${fileName} (${(file.size / 1024).toFixed(1)} KiB)`);
  }
}

if (oversizedChunks.length > 0) {
  console.error(`JavaScript chunks must not exceed ${maxChunkBytes / 1024} KiB:`);
  for (const chunk of oversizedChunks) console.error(`- ${chunk}`);
  process.exitCode = 1;
} else {
  console.log(`Bundle size check passed (all JavaScript chunks <= ${maxChunkBytes / 1024} KiB).`);
}
