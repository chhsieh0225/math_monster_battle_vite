import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function bundleReport(assets = 'dist/assets'): string {
  const chunks = readdirSync(assets).filter(file => file.endsWith('.js'))
    .map(file => ({ file, bytes: statSync(join(assets, file)).size }))
    .sort((a, b) => b.bytes - a.bytes);
  if (!chunks.length) throw new Error(`No built JavaScript found in ${assets}`);
  const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;
  return [
    `JavaScript size report (informational, no size limit): ${kib(chunks.reduce((sum, chunk) => sum + chunk.bytes, 0))}`,
    ...chunks.map(chunk => `  ${chunk.file.padEnd(48)} ${kib(chunk.bytes)}`),
  ].join('\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(bundleReport());
}
