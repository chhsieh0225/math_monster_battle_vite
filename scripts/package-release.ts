import { createHash } from 'node:crypto';
import { copyFileSync, createReadStream, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, renameSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_NAME = 'Math Monster Brawl.app';
type Arch = 'arm64' | 'x64' | 'universal';

/**
 * Cloud sync (Dropbox, iCloud) does not preserve the symlinks inside an app's
 * frameworks, so the playable app is installed outside the project. Other Macs
 * get a single-file zip, which syncs byte-for-byte.
 */
export function deliveryPaths(home: string, root: string, appName = APP_NAME) {
  const applications = join(home, 'Applications');
  const stem = basename(appName, '.app');
  const cache = join(home, 'Library', 'Caches', 'math-monster-battle');
  return {
    applications,
    app: join(applications, appName),
    // No .app suffix, so Launch Services never lists the old copy as a second game.
    backup: join(applications, `.${stem}.previous-app`),
    staging: join(applications, `.${stem}.staging`),
    zip: join(root, `${stem}.zip`),
    // Temporary zips stay in the git-ignored release folder.
    zipPartial: join(root, 'release', `.${stem}.zip.partial`),
    zipPrevious: join(root, 'release', `.${stem}.zip.previous`),
    cache,
    // ~/Applications is shared by every checkout, so installs are serialized per user.
    installLock: join(cache, 'install.lock'),
  };
}

type PublishPaths = Pick<ReturnType<typeof deliveryPaths>, 'app' | 'backup' | 'zip' | 'zipPartial' | 'zipPrevious'>;

/** Swap in the new app and zip together; if anything fails, both previous copies come back. */
export function publishRelease(candidate: string, zipSource: string, paths: PublishPaths, record: () => void): void {
  copyFileSync(zipSource, paths.zipPartial);
  try {
    replaceApp(candidate, paths.app, paths.backup, () => {
      rmSync(paths.zipPrevious, { force: true });
      const hadZip = existsSync(paths.zip);
      if (hadZip) renameSync(paths.zip, paths.zipPrevious);
      try {
        renameSync(paths.zipPartial, paths.zip);
        record();
      } catch (error) {
        rmSync(paths.zip, { force: true });
        if (hadZip) renameSync(paths.zipPrevious, paths.zip);
        throw error;
      }
    });
    rmSync(paths.zipPrevious, { force: true });
  } finally {
    rmSync(paths.zipPartial, { force: true });
  }
}

/**
 * A backup left in ~/Applications means a swap stopped midway. If the installed
 * app is already the recorded latest build, the swap had finished and the backup
 * can go; otherwise a person must decide which copy to keep.
 */
export function leftoverBackupAction(state: { backupExists: boolean; installedSha: string; latestStatus?: string; latestSha?: string }): 'none' | 'remove' | 'stop' {
  if (!state.backupExists) return 'none';
  return state.installedSha && state.latestStatus === 'ready' && state.installedSha === state.latestSha ? 'remove' : 'stop';
}

/** A versioned framework is only intact when its Versions/Current link survived copying. */
export function assertFrameworkLinks(app: string): void {
  const frameworks = join(app, 'Contents', 'Frameworks');
  const names = existsSync(frameworks) ? readdirSync(frameworks).filter((name) => name.endsWith('.framework')) : [];
  if (names.length === 0) throw new Error(`No frameworks found in ${app}`);
  for (const name of names) {
    const current = join(frameworks, name, 'Versions', 'Current');
    if (!existsSync(current) || !lstatSync(current).isSymbolicLink()) {
      throw new Error(`${name} lost its Versions/Current link; the app would not start`);
    }
  }
}

const PATHS = deliveryPaths(homedir(), ROOT);

function capture(command: string, args: string[], cwd = ROOT): string {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function run(command: string, args: string[], cwd = ROOT): void {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: {
    ...process.env, ELECTRON_BUILDER_CACHE: join(PATHS.cache, 'builder'),
  } });
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status ?? result.error?.message})`);
}

export function releaseId(version: string, revision: string, fingerprint: string, arch: string, now = new Date()): string {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error('Invalid release version');
  if (!/^[a-f0-9]{7,40}$/.test(revision) || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Invalid source identity');
  if (!['arm64', 'x64', 'universal'].includes(arch)) throw new Error('Unsupported Mac architecture');
  return `${version}-${now.toISOString().replace(/[-:.]/g, '')}-${revision.slice(0, 7)}-${fingerprint.slice(0, 8)}-${arch}`;
}

export function reserveReleaseDirectory(parent: string, id: string): string {
  if (!/^[\w.-]+$/.test(id) || id === '.' || id === '..') throw new Error('Invalid release directory');
  mkdirSync(parent, { recursive: true });
  const output = join(parent, id);
  mkdirSync(output); // No recursive flag: a previous release must never be overwritten.
  return output;
}

/** Keep the working app until the replacement and its build receipt are committed. */
export function replaceApp(source: string, destination: string, backup: string, commit: () => void): void {
  if (!lstatSync(source).isDirectory()) throw new Error('Replacement app is missing');
  if (existsSync(backup)) throw new Error(`Previous replacement was interrupted; recover ${backup} before retrying`);
  const hadPrevious = existsSync(destination);
  if (hadPrevious) renameSync(destination, backup);
  let installed = false;
  try {
    renameSync(source, destination);
    installed = true;
    commit();
  } catch (error) {
    if (installed) renameSync(destination, source);
    if (hadPrevious) renameSync(backup, destination);
    throw error;
  }
  if (hadPrevious) {
    try { rmSync(backup, { recursive: true }); }
    catch { console.warn(`Updated successfully; old temporary copy could not be removed: ${backup}`); }
  }
}

/** Include dirty/new/deleted files without copying source or credentials into the release. */
export function sourceFingerprint(root: string): string {
  const names = capture('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], root).split('\0').filter(Boolean);
  const hash = createHash('sha256');
  for (const name of [...new Set(names)].sort()) {
    const path = join(root, name);
    hash.update(name).update('\0');
    if (!existsSync(path)) hash.update('deleted');
    else {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) hash.update('link:').update(readlinkSync(path));
      // git lists an untracked nested repository/worktree as one directory entry.
      else if (stat.isDirectory()) hash.update('directory');
      else hash.update(readFileSync(path));
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

async function main(): Promise<void> {
  if (process.platform !== 'darwin') throw new Error('Mac apps must be built on macOS. Use the Package Apps workflow on other platforms.');
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Packaging requires Node.js 22 or newer');
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(a => !/^--arch=(arm64|x64|universal)$/.test(a))) throw new Error('Usage: npm run package:release -- [--arch=arm64|x64|universal]');
  const arch = (args[0]?.split('=')[1] || process.arch) as Arch;
  const version = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }).version;
  const revision = capture('git', ['rev-parse', 'HEAD']);
  const fingerprint = sourceFingerprint(ROOT);
  const id = releaseId(version, revision, fingerprint, arch);
  const releases = join(ROOT, 'release');
  const receipt = join(releases, '.receipts', `${id}.json`);
  const manifest = {
    id, version, revision, fingerprint, arch, createdAt: new Date().toISOString(),
    dirty: Boolean(capture('git', ['status', '--porcelain'])), status: 'building',
    checks: [] as string[], macSigning: 'ad-hoc (not notarized)',
    app: '', zip: '', appContentSha256: '', error: '',
  };
  mkdirSync(releases, { recursive: true });
  const lock = join(releases, '.package-lock');
  mkdirSync(lock); // Serialize builds because dist is shared.
  let installLocked = false;
  let output: string | undefined;
  let buildDirectory: string | undefined;
  // Ctrl+C reaches the running tool too; let it fail so cleanup runs, and never swap afterwards.
  let interrupted = false;
  const onSignal = () => { interrupted = true; };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    mkdirSync(PATHS.cache, { recursive: true });
    try { mkdirSync(PATHS.installLock); installLocked = true; }
    catch { throw new Error(`Another packaging run is installing the app. If none is running, remove ${PATHS.installLock}`); }
    rmSync(PATHS.staging, { recursive: true, force: true }); // Leftovers from interrupted runs.
    const installedAsar = join(PATHS.app, 'Contents/Resources/app.asar');
    let latest: { status?: string; appContentSha256?: string } = {};
    try { latest = JSON.parse(readFileSync(join(releases, 'latest.json'), 'utf8')) as typeof latest; } catch { /* first build */ }
    const leftover = leftoverBackupAction({
      backupExists: existsSync(PATHS.backup),
      installedSha: existsSync(PATHS.backup) && existsSync(installedAsar) ? await sha256(installedAsar) : '',
      latestStatus: latest.status, latestSha: latest.appContentSha256,
    });
    if (leftover === 'remove') rmSync(PATHS.backup, { recursive: true, force: true });
    if (leftover === 'stop') {
      throw new Error(`A previous install stopped midway. Keep the copy that works (${PATHS.app} or ${PATHS.backup}), remove the other, then retry.`);
    }
    // Stage next to the installed app (same volume, outside cloud sync) so the swap is a rename.
    output = reserveReleaseDirectory(PATHS.staging, id);
    // Build outside cloud-synced folders so File Provider metadata cannot affect packaging.
    buildDirectory = mkdtempSync(join(tmpdir(), 'math-monster-build-'));
    mkdirSync(dirname(receipt), { recursive: true });
    const save = () => writeFileSync(receipt, JSON.stringify(manifest, null, 2) + '\n');
    save();
    for (const task of ['typecheck', 'lint', 'test', 'build:report']) {
      run('npm', ['run', task, ...(task === 'lint' ? ['--', '--max-warnings=0'] : [])]);
      manifest.checks.push(task);
      save();
    }
    writeFileSync(join(ROOT, 'dist', 'release-info.json'), JSON.stringify({ id, version, revision, fingerprint }));
    // The installed app writes playtest logs into this project's playtest/ folder (Dropbox-synced, git-ignored).
    writeFileSync(join(ROOT, 'dist', 'playtest-target.json'), JSON.stringify({ dir: join(ROOT, 'playtest') }));
    run(process.execPath, [join(ROOT, 'node_modules/electron-builder/cli.js'), '--mac', '--dir', `--${arch}`, '--publish', 'never',
      `-c.directories.output=${buildDirectory}`, '-c.mac.identity=-',
      `-c.electronDownload.cache=${join(PATHS.cache, 'electron')}`]);
    // The project path belongs only inside the packaged app, never in web or iOS builds of dist/.
    rmSync(join(ROOT, 'dist', 'playtest-target.json'), { force: true });
    const app = join(buildDirectory, arch === 'x64' ? 'mac' : `mac-${arch}`, APP_NAME);
    manifest.appContentSha256 = await sha256(join(app, 'Contents/Resources/app.asar'));
    const candidate = join(output, APP_NAME);
    run('ditto', ['--norsrc', '--noextattr', app, candidate]);
    // Remove only Finder/resource-fork metadata on this generated copy, not security attributes.
    for (const attribute of ['com.apple.FinderInfo', 'com.apple.ResourceFork']) {
      const clean = spawnSync('xattr', ['-dr', attribute, candidate], { encoding: 'utf8' });
      if (clean.error || clean.status !== 0) throw new Error(clean.error?.message || clean.stderr || 'Could not clean build metadata');
    }
    if (await sha256(join(candidate, 'Contents/Resources/app.asar')) !== manifest.appContentSha256) throw new Error('App copy is incomplete');
    assertFrameworkLinks(candidate);

    // One file for other Macs: zip archives keep the framework links that sync tools drop.
    const zipBuild = join(buildDirectory, basename(PATHS.zip));
    run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', candidate, zipBuild]);
    const zipCheck = join(buildDirectory, 'zip-check');
    run('ditto', ['-x', '-k', zipBuild, zipCheck]);
    const unzipped = join(zipCheck, APP_NAME);
    if (await sha256(join(unzipped, 'Contents/Resources/app.asar')) !== manifest.appContentSha256) throw new Error('Zip copy is incomplete');
    assertFrameworkLinks(unzipped);

    if (sourceFingerprint(ROOT) !== fingerprint) throw new Error('Source changed during packaging; this output is not promoted to latest');
    if (interrupted) throw new Error('Packaging was interrupted; the installed app was not changed');
    publishRelease(candidate, zipBuild, PATHS, () => {
      manifest.app = PATHS.app;
      manifest.zip = PATHS.zip;
      manifest.status = 'ready';
      save();
      const latestTemp = join(releases, 'latest.json.tmp');
      writeFileSync(latestTemp, JSON.stringify(manifest, null, 2) + '\n');
      renameSync(latestTemp, join(releases, 'latest.json'));
    });
    console.log(`\nReady: ${PATHS.app}\nDouble-click the app to play. No dev server or installation tools needed.`
      + `\nOther Macs: copy ${basename(PATHS.zip)} out of Dropbox, unzip it, and drag the app into Applications.`
      + `\n完成！App 在「個人資料夾 → 應用程式」：${PATHS.app}（Finder 已幫你打開並選取它，也可用 Spotlight 搜尋 Math Monster Brawl）`);
    // Show the new app in Finder so it is never "somewhere" (skipped in CI).
    if (!process.env.CI) spawnSync('open', ['-R', PATHS.app], { stdio: 'ignore' });
  } catch (error) {
    manifest.status = 'failed';
    manifest.error = error instanceof Error ? error.message : String(error);
    if (existsSync(dirname(receipt))) writeFileSync(receipt, JSON.stringify(manifest, null, 2) + '\n');
    throw error;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    if (buildDirectory) rmSync(buildDirectory, { recursive: true, force: true });
    if (output) rmSync(output, { recursive: true, force: true });
    rmSync(PATHS.zipPartial, { force: true });
    rmSync(join(releases, 'latest.json.tmp'), { force: true });
    if (installLocked) {
      try { rmdirSync(PATHS.staging); } catch { /* already gone */ }
      rmSync(PATHS.installLock, { recursive: true, force: true });
    }
    rmSync(lock, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
