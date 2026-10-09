import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Retired atlases (v1 drawings, pilot comparisons) and art-audit JSON stay in
 * public/ for rollback and tests, but builds ship only what battles load.
 */
const REGISTRY = 'src/data/spriteAnimationAssets.ts';
const ATLAS_DIR = join('sprites', 'visual-pilot');

export function activeAtlasFiles(registrySource: string): Set<string> {
  return new Set([...registrySource.matchAll(/\bfile:\s*'([^'/\\]+\.webp)'/g)].map((match) => match[1]));
}

export function retiredAtlasFiles(fileNames: readonly string[], active: ReadonlySet<string>): string[] {
  if (active.size === 0) throw new Error('No active battle atlases found; refusing to prune the build');
  const missing = [...active].filter((file) => !fileNames.includes(file));
  if (missing.length > 0) throw new Error(`Active battle atlases are missing from the build: ${missing.join(', ')}`);
  return fileNames.filter((file) => !active.has(file));
}

export function pruneRetiredAtlases(): Plugin {
  let root = process.cwd();
  let outDir = 'dist';
  return {
    name: 'prune-retired-atlases',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle(error?: Error) {
      if (error) return; // Let the real build error surface instead of checking a stale dist.
      const directory = join(outDir, ATLAS_DIR);
      if (!existsSync(directory)) return;
      const active = activeAtlasFiles(readFileSync(resolve(root, REGISTRY), 'utf8'));
      for (const file of retiredAtlasFiles(readdirSync(directory), active)) {
        rmSync(join(directory, file), { force: true });
      }
    },
  };
}
