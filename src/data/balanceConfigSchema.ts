type ValidationIssue = string;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getPath(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!isObject(acc)) return undefined;
    return acc[key];
  }, root);
}

function checkNumber(
  root: unknown,
  path: string,
  issues: ValidationIssue[],
  options: { min?: number; max?: number } = {},
): number | null {
  const value = getPath(root, path);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`);
    return null;
  }
  if (options.min != null && value < options.min) {
    issues.push(`${path} must be >= ${options.min}`);
  }
  if (options.max != null && value > options.max) {
    issues.push(`${path} must be <= ${options.max}`);
  }
  return value;
}

function checkNonEmptyArray(root: unknown, path: string, issues: ValidationIssue[]): unknown[] | null {
  const value = getPath(root, path);
  if (!Array.isArray(value)) {
    issues.push(`${path} must be a non-empty array`);
    return null;
  }
  const arr = value as unknown[];
  if (arr.length === 0) {
    issues.push(`${path} must be a non-empty array`);
    return null;
  }
  return arr;
}

function checkMinMax(root: unknown, minPath: string, maxPath: string, issues: ValidationIssue[]): void {
  const min = checkNumber(root, minPath, issues);
  const max = checkNumber(root, maxPath, issues);
  if (min != null && max != null && min > max) {
    issues.push(`${minPath} must be <= ${maxPath}`);
  }
}

export function validateBalanceConfigSchema(config: unknown): void {
  const issues: ValidationIssue[] = [];

  if (!isObject(config)) {
    throw new Error('[balance-config] config must be an object');
  }

  checkNumber(config, 'dualTypeEffCap', issues, { min: 1, max: 3 });
  checkNumber(config, 'hpPerLevel', issues, { min: 0 });
  checkNumber(config, 'evolutionHpBonus', issues, { min: 0 });

  checkMinMax(config, 'damage.playerAttackVariance.min', 'damage.playerAttackVariance.max', issues);
  checkMinMax(config, 'damage.enemyAttackVariance.min', 'damage.enemyAttackVariance.max', issues);

  checkNonEmptyArray(config, 'stage.waves.single', issues);
  checkNonEmptyArray(config, 'stage.waves.double', issues);
  checkNonEmptyArray(config, 'monsters.bossIds', issues);

  checkNumber(config, 'pvp.baseScale', issues, { min: 0.1, max: 2 });
  checkMinMax(config, 'pvp.varianceMin', 'pvp.varianceMax', issues);
  checkNumber(config, 'pvp.minDamage', issues, { min: 0 });
  checkNumber(config, 'pvp.maxDamage', issues, { min: 1 });

  const moveSlotScale = checkNonEmptyArray(config, 'pvp.moveSlotScale', issues);
  if (moveSlotScale && moveSlotScale.length !== 4) {
    issues.push('pvp.moveSlotScale must contain exactly 4 entries');
  }

  checkNumber(config, 'pvp.crit.chance', issues, { min: 0, max: 1 });
  checkNumber(config, 'pvp.crit.maxChance', issues, { min: 0, max: 1 });
  checkNumber(config, 'pvp.crit.multiplier', issues, { min: 1 });
  checkNumber(config, 'crit.pve.player.chance', issues, { min: 0, max: 1 });
  checkNumber(config, 'crit.pve.enemy.chance', issues, { min: 0, max: 1 });

  checkNumber(config, 'traits.player.specDefComboTrigger', issues, { min: 1 });
  checkNumber(config, 'traits.boss.phase2AttackMultiplier', issues, { min: 1 });
  checkNumber(config, 'traits.boss.phase3AttackMultiplier', issues, { min: 1 });
  checkNumber(config, 'traits.boss.releaseAttackScale', issues, { min: 1 });

  const pressureFloors = checkNonEmptyArray(config, 'challenges.tower.pressureBands.floors', issues);
  const pressureHp = checkNonEmptyArray(config, 'challenges.tower.pressureBands.hpBonus', issues);
  const pressureAtk = checkNonEmptyArray(config, 'challenges.tower.pressureBands.atkBonus', issues);
  if (pressureFloors && pressureHp && pressureFloors.length !== pressureHp.length) {
    issues.push('challenges.tower.pressureBands.hpBonus length must match floors length');
  }
  if (pressureFloors && pressureAtk && pressureFloors.length !== pressureAtk.length) {
    issues.push('challenges.tower.pressureBands.atkBonus length must match floors length');
  }

  if (issues.length > 0) {
    const message = [
      '[balance-config] Invalid BALANCE_CONFIG detected:',
      ...issues.map((issue) => `- ${issue}`),
      'Please fix src/data/balanceConfig.ts before continuing.',
    ].join('\n');
    throw new Error(message);
  }
}
