import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCheckpointsCache } from '../src/lib/utils/github-checkpoints.js';

export {
  buildHeaders,
  extractBmadCommands,
  extractTranscriptData,
  fetchWithRetry,
  parseMetadata,
} from '../src/lib/utils/github-checkpoints.js';

async function run(): Promise<void> {
  const { cache, apiCallCount, elapsedMs } = await fetchCheckpointsCache({
    token: process.env['GITHUB_TOKEN'],
    logger: console,
  });

  const outputPath = resolve('./src/data/checkpoints-cache.json');
  writeFileSync(outputPath, JSON.stringify(cache, null, 2), 'utf-8');

  const elapsed = (elapsedMs / 1000).toFixed(1);
  console.log(
    `\nDone. Checkpoints: ${checkpoints.length}, API calls: ${apiCallCount}, Time: ${elapsed}s`
  );
  console.log(`Output: ${outputPath}`);
}

const isMainModule =
  typeof process.argv[1] === 'string' && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  run().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
