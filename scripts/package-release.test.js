import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assertFrameworkLinks, deliveryPaths, leftoverBackupAction, publishRelease, releaseId, replaceApp, reserveReleaseDirectory, sourceFingerprint } from './package-release.ts';
import { bundleReport } from './bundle-report.ts';

test('release IDs distinguish architecture, dirty content and repeated builds without unsafe paths', () => {
  const at = new Date('2026-10-09T10:00:00.000Z');
  const fingerprint = 'a'.repeat(64);
  const id = releaseId('1.0.0', 'abcdef012345', fingerprint, 'arm64', at);
  assert.match(id, /^1\.0\.0-20261009T100000000Z-abcdef0-aaaaaaaa-arm64$/);
  assert.notEqual(id, releaseId('1.0.0', 'abcdef012345', 'b'.repeat(64), 'arm64', at));
  assert.notEqual(id, releaseId('1.0.0', 'abcdef012345', fingerprint, 'x64', at));
  assert.notEqual(id, releaseId('1.0.0', 'abcdef012345', fingerprint, 'arm64', new Date(at.getTime() + 1)));
  for (const version of ['../escape', 'bad', '1.0.0/other']) assert.throws(() => releaseId(version, 'abcdef0', fingerprint, 'arm64', at));
  assert.throws(() => releaseId('1.0.0', 'bad-revision', fingerprint, 'arm64', at));
  assert.throws(() => releaseId('1.0.0', 'abcdef0', fingerprint, 'windows', at));
});

test('reserving a release never replaces an earlier package, even if the ID collides', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = reserveReleaseDirectory(root, 'version-one');
  writeFileSync(join(output, 'existing.app'), 'keep existing package');
  assert.throws(() => reserveReleaseDirectory(root, 'version-one'), /EEXIST/);
  assert.equal(readFileSync(join(output, 'existing.app'), 'utf8'), 'keep existing package');
  for (const name of ['../escape', '..', '.', '/absolute']) assert.throws(() => reserveReleaseDirectory(root, name));
});

test('source fingerprint covers tracked edits, additions and deletions but excludes generated packages', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-release-source-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', root]);
  writeFileSync(join(root, '.gitignore'), 'release/\n');
  writeFileSync(join(root, 'game.ts'), 'before');
  execFileSync('git', ['add', '.'], { cwd: root });
  const before = sourceFingerprint(root);
  mkdirSync(join(root, 'release'));
  writeFileSync(join(root, 'release', 'manifest.json'), '{}');
  assert.equal(sourceFingerprint(root), before);
  writeFileSync(join(root, 'game.ts'), 'after');
  const edited = sourceFingerprint(root);
  assert.notEqual(edited, before);
  writeFileSync(join(root, 'new.ts'), 'new');
  assert.notEqual(sourceFingerprint(root), edited);
  rmSync(join(root, 'new.ts'));
  assert.equal(sourceFingerprint(root), edited);
  rmSync(join(root, 'game.ts'));
  assert.notEqual(sourceFingerprint(root), edited);
});

test('source fingerprint tolerates an untracked nested repository or worktree', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-release-nested-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', root]);
  writeFileSync(join(root, 'game.ts'), 'game');
  const nested = join(root, 'tools', 'worktree');
  mkdirSync(nested, { recursive: true });
  execFileSync('git', ['init', '--quiet', nested]);
  writeFileSync(join(nested, 'copy.ts'), 'copy');
  assert.match(sourceFingerprint(root), /^[a-f0-9]{64}$/);
});

test('the playable app is installed outside the cloud-synced project; only a zip is shared there', () => {
  const home = '/Users/kid';
  const root = '/Users/kid/Library/CloudStorage/Dropbox/Codes/game';
  const paths = deliveryPaths(home, root);
  assert.equal(paths.app, '/Users/kid/Applications/Math Monster Brawl.app');
  assert.ok(!paths.app.startsWith(root));
  assert.equal(dirname(paths.backup), dirname(paths.app), 'backup must be a same-volume rename');
  assert.ok(!paths.backup.endsWith('.app'), 'the old copy must not register as a second app');
  assert.equal(dirname(paths.staging), dirname(paths.app));
  assert.equal(paths.zip, `${root}/Math Monster Brawl.zip`);
  assert.equal(dirname(paths.zipPartial), `${root}/release`, 'temporary zips live in the git-ignored release folder');
  assert.equal(dirname(paths.zipPrevious), `${root}/release`);
  assert.ok(paths.cache.startsWith('/Users/kid/Library/Caches/'), 'download caches stay out of the synced project');
  assert.ok(paths.installLock.startsWith(paths.cache), 'one install lock per user, shared by every checkout');
});

function publishFixture(t, { previousApp = true, previousZip = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'math-publish-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'release'));
  const paths = {
    app: join(root, 'Applications', 'Game.app'),
    backup: join(root, 'Applications', '.Game.previous-app'),
    zip: join(root, 'Game.zip'),
    zipPartial: join(root, 'release', '.Game.zip.partial'),
    zipPrevious: join(root, 'release', '.Game.zip.previous'),
  };
  mkdirSync(join(root, 'Applications'));
  if (previousApp) { mkdirSync(paths.app); writeFileSync(join(paths.app, 'version'), 'old'); }
  if (previousZip) writeFileSync(paths.zip, 'old zip');
  const candidate = join(root, 'staging', 'Game.app');
  mkdirSync(candidate, { recursive: true });
  writeFileSync(join(candidate, 'version'), 'new');
  const zipSource = join(root, 'built.zip');
  writeFileSync(zipSource, 'new zip');
  return { root, paths, candidate, zipSource };
}

test('publishing replaces the installed app and the shared zip together', t => {
  const { paths, candidate, zipSource } = publishFixture(t);
  let recorded = false;
  publishRelease(candidate, zipSource, paths, () => {
    recorded = true;
    assert.equal(readFileSync(paths.zip, 'utf8'), 'new zip', 'receipts are written after the new zip is in place');
  });
  assert.equal(recorded, true);
  assert.equal(readFileSync(join(paths.app, 'version'), 'utf8'), 'new');
  assert.equal(readFileSync(paths.zip, 'utf8'), 'new zip');
  for (const leftover of [paths.backup, paths.zipPartial, paths.zipPrevious]) {
    assert.throws(() => readFileSync(leftover), /ENOENT|EISDIR/);
  }
});

test('a failed receipt restores both the previous app and the previous zip', t => {
  const { paths, candidate, zipSource } = publishFixture(t);
  assert.throws(() => publishRelease(candidate, zipSource, paths, () => { throw new Error('receipt failed'); }), /receipt failed/);
  assert.equal(readFileSync(join(paths.app, 'version'), 'utf8'), 'old');
  assert.equal(readFileSync(paths.zip, 'utf8'), 'old zip');
  assert.throws(() => readFileSync(paths.zipPartial), /ENOENT/);
  assert.throws(() => readFileSync(paths.zipPrevious), /ENOENT/);
});

test('a failed first publication leaves no half-published zip', t => {
  const { paths, candidate, zipSource } = publishFixture(t, { previousApp: false, previousZip: false });
  assert.throws(() => publishRelease(candidate, zipSource, paths, () => { throw new Error('disk full'); }), /disk full/);
  assert.throws(() => readFileSync(paths.zip), /ENOENT/);
  assert.throws(() => readFileSync(join(paths.app, 'version')), /ENOENT/);
  assert.throws(() => readFileSync(paths.zipPartial), /ENOENT/);
});

test('a leftover backup is removed only when the installed app is the recorded latest build', () => {
  assert.equal(leftoverBackupAction({ backupExists: false, installedSha: '' }), 'none');
  assert.equal(leftoverBackupAction({ backupExists: true, installedSha: 'abc', latestStatus: 'ready', latestSha: 'abc' }), 'remove');
  assert.equal(leftoverBackupAction({ backupExists: true, installedSha: 'abc', latestStatus: 'ready', latestSha: 'def' }), 'stop');
  assert.equal(leftoverBackupAction({ backupExists: true, installedSha: 'abc', latestStatus: 'failed', latestSha: 'abc' }), 'stop');
  assert.equal(leftoverBackupAction({ backupExists: true, installedSha: '', latestStatus: 'ready', latestSha: '' }), 'stop');
});

test('framework link check rejects apps whose Versions/Current link was flattened by sync', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-framework-links-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = join(root, 'Game.app');
  const framework = join(app, 'Contents', 'Frameworks', 'Electron Framework.framework');
  mkdirSync(join(framework, 'Versions', 'A', 'Resources'), { recursive: true });
  symlinkSync('A', join(framework, 'Versions', 'Current'));
  assertFrameworkLinks(app);

  // unlink removes the link itself; newer Node on macOS refuses rmSync on a link to a directory.
  unlinkSync(join(framework, 'Versions', 'Current'));
  mkdirSync(join(framework, 'Versions', 'Current'));
  assert.throws(() => assertFrameworkLinks(app), /lost its Versions\/Current link/);
  assert.throws(() => assertFrameworkLinks(join(root, 'Empty.app')), /No frameworks found/);
});

test('successful replacement leaves one current app and removes the old temporary copy', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-replace-app-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'new.app');
  const destination = join(root, 'Game.app');
  const backup = join(root, '.previous.app');
  mkdirSync(source);
  mkdirSync(destination);
  writeFileSync(join(source, 'version'), 'new');
  writeFileSync(join(destination, 'version'), 'old');
  let committed = false;
  replaceApp(source, destination, backup, () => { committed = true; });
  assert.equal(committed, true);
  assert.equal(readFileSync(join(destination, 'version'), 'utf8'), 'new');
  assert.throws(() => readFileSync(join(backup, 'version')), /ENOENT/);
  assert.throws(() => readFileSync(join(source, 'version')), /ENOENT/);
});

test('failed publication restores the old playable app and keeps the new candidate separate', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-rollback-app-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'new.app');
  const destination = join(root, 'Game.app');
  const backup = join(root, '.previous.app');
  mkdirSync(source);
  mkdirSync(destination);
  writeFileSync(join(source, 'version'), 'new');
  writeFileSync(join(destination, 'version'), 'old');
  assert.throws(() => replaceApp(source, destination, backup, () => { throw new Error('receipt failed'); }), /receipt failed/);
  assert.equal(readFileSync(join(destination, 'version'), 'utf8'), 'old');
  assert.equal(readFileSync(join(source, 'version'), 'utf8'), 'new');
  assert.throws(() => replaceApp(join(root, 'missing'), destination, backup, () => {}), /ENOENT/);
  assert.equal(readFileSync(join(destination, 'version'), 'utf8'), 'old');
  mkdirSync(backup);
  assert.throws(() => replaceApp(source, destination, backup, () => {}), /interrupted/);
});

test('first publication works without a previous app', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-first-app-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'new.app');
  const destination = join(root, 'Game.app');
  mkdirSync(source);
  writeFileSync(join(source, 'version'), 'first');
  replaceApp(source, destination, join(root, '.previous.app'), () => {});
  assert.equal(readFileSync(join(destination, 'version'), 'utf8'), 'first');
});

test('large bundles remain report-only, while missing build output is still an error', t => {
  const root = mkdtempSync(join(tmpdir(), 'math-size-report-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => bundleReport(root), /No built JavaScript/);
  writeFileSync(join(root, 'index-large.js'), 'x'.repeat(3 * 1024 * 1024));
  writeFileSync(join(root, 'extra.js'), 'y'.repeat(1024));
  writeFileSync(join(root, 'styles.css'), 'not counted');
  const report = bundleReport(root);
  assert.match(report, /informational, no size limit/);
  assert.match(report, /3073\.0 KiB/);
  assert.doesNotMatch(report, /styles\.css/);
  assert.throws(() => bundleReport(join(root, 'missing')), /ENOENT/);
});

test('default release delivers an installed app plus one app zip, not installers or source archives', () => {
  const packager = readFileSync(new URL('./package-release.ts', import.meta.url), 'utf8');
  assert.match(packager, /'--mac', '--dir'/);
  // The only archive is the verified app zip made by ditto; electron-builder only emits the app folder.
  assert.doesNotMatch(packager, /web\.zip|ios-project\.zip|'dmg'|IOS_TEAM_ID/);
  assert.doesNotMatch(packager, /'codesign', \['--verify'/);
  assert.doesNotMatch(packager, /join\(ROOT, basename\(app\)\)/, 'the app itself must not be placed in the synced project');
  assert.match(packager, /publishRelease\(candidate, zipBuild, PATHS/);
  assert.match(packager, /if \(interrupted\) throw/);
  assert.match(packager, /'-c', '-k', '--sequesterRsrc', '--keepParent'/);
  assert.match(packager, /assertFrameworkLinks\(unzipped\)/);
  assert.match(packager, /'typecheck', 'lint', 'test', 'build:report'/);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['build:budget'], 'npm run build:report');
  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(ci, /npm run build:report/);
  assert.doesNotMatch(ci, /build:budget/);
});

test('shipping packages before publishing and never stages unrelated changes automatically', () => {
  const ship = readFileSync(new URL('./ship.sh', import.meta.url), 'utf8');
  assert.ok(ship.indexOf('npm run package:release') < ship.indexOf('git commit'));
  assert.doesNotMatch(ship, /^git add -A/m);
  const workflow = readFileSync(new URL('../.github/workflows/packages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /github\.event\.workflow_run\.head_sha \|\| github\.sha/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /--arch=universal/);
  assert.match(workflow, /path: Math Monster Brawl\.zip/);
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.match(main, /protocol === 'https:'.*protocol === 'http:'/);
  assert.match(main, /VisualPilot = import\.meta\.env\.DEV \? lazy/);
});
