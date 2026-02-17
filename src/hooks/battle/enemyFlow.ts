import { BALANCE_CONFIG } from '../../data/balanceConfig.ts';
import { getEff } from '../../data/typeEffectiveness.ts';
import { calcEnemyDamage } from '../../utils/damageCalc.ts';
import { computeBossPhase } from '../../utils/turnFlow.ts';
import { effectOrchestrator } from './effectOrchestrator.ts';
import { isBattleActiveState, scheduleIfBattleActive, tryReturnToMenu } from './menuResetGuard.ts';
import {
  resolveBossTurnState,
  resolveEnemyAssistStrike,
  resolveEnemyPrimaryStrike,
} from './turnResolver.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type TargetSlot = 'main' | 'sub';

type BattleMove = {
  name?: string;
};

type BattleStarter = {
  name?: string;
  type?: string;
  moves?: BattleMove[];
};

type BattleAlly = {
  name?: string;
  type?: string;
};

type BattleEnemy = {
  id?: string;
  name?: string;
  atk?: number;
  maxHp?: number;
  mType?: string;
  trait?: string;
};

type BattleRuntimeState = {
  pHp: number;
  pHpSub: number;
  allySub: BattleAlly | null;
  starter: BattleStarter | null;
  enemy: BattleEnemy | null;
  enemySub: BattleEnemy | null;
  eHp: number;
  specDef: boolean;
  bossTurn: number;
  bossCharging: boolean;
  sealedMove: number;
  sealedTurns: number;
  bossPhase: number;
  cursed: boolean;
  phase?: string;
  screen?: string;
};

type StateRef = {
  current: BattleRuntimeState;
};

type SafeTo = (fn: () => void, ms: number) => void;
type RandomFn = () => number;
type RandomIntFn = (min: number, max: number) => number;
type ChanceFn = (probability: number) => boolean;

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type TextSetter = (value: string) => void;
type NullableTextSetter = (value: string | null) => void;
type PhaseSetter = (value: string) => void;
type DefAnimSetter = (value: string | null) => void;

type EffectMessage = {
  text: string;
  color: string;
};

type EffectMessageSetter = (value: EffectMessage | null) => void;

type DamagePopupAdder = (value: string, x: number, y: number, color: string) => void;
type ParticleAdder = (emoji: string, x: number, y: number, count?: number) => void;

type PlayerPartyKoHandler = (args: { target: TargetSlot; reason: string }) => unknown;

type SfxApi = {
  play: (name: string) => void;
};

type EffectOrchestratorApi = {
  runEnemyLunge: (args: {
    safeTo: SafeTo;
    setEAnim: TextSetter;
    onStrike?: () => void;
    strikeDelay?: number;
  }) => void;
};

type RunEnemyTurnArgs = {
  sr: StateRef;
  safeTo: SafeTo;
  rand: RandomFn;
  randInt: RandomIntFn;
  chance: ChanceFn;
  sfx: SfxApi;
  setSealedTurns: NumberSetter;
  setSealedMove: NumberSetter;
  setBossPhase: NumberSetter;
  setBossTurn: NumberSetter;
  setBossCharging: BoolSetter;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  setEAnim: TextSetter;
  setPAnim: TextSetter;
  setPHp: NumberSetter;
  setPHpSub: NumberSetter;
  setSpecDef: BoolSetter;
  setDefAnim: DefAnimSetter;
  setEHp: NumberSetter;
  setEffMsg: EffectMessageSetter;
  setCursed: BoolSetter;
  addD: DamagePopupAdder;
  addP: ParticleAdder;
  _endSession: (completed: boolean, reasonOverride?: string | null) => void;
  setScreen: (screen: string) => void;
  handleVictory: (verb?: string) => void;
  handlePlayerPartyKo?: PlayerPartyKoHandler;
  t?: Translator;
};

type ApplyDamageArgs = {
  s: BattleRuntimeState;
  target: TargetSlot;
  dmg: number;
  label?: string | null;
  color?: string;
};

const getEffTyped = getEff as (moveType?: string, monType?: string) => number;
const calcEnemyDamageTyped = calcEnemyDamage as (atkStat: number, defEff: number) => number;
const computeBossPhaseTyped = computeBossPhase as (currentHp: number, maxHp: number) => number;
const effectOrchestratorTyped = effectOrchestrator as EffectOrchestratorApi;
const TRAIT_BALANCE = BALANCE_CONFIG.traits;
const DAMAGE_BALANCE = BALANCE_CONFIG.damage;

function formatFallback(template: string, params?: TranslatorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, key: string) => String(params[key] ?? ''));
}

function tr(
  t: Translator | undefined,
  key: string,
  fallback: string,
  params?: TranslatorParams,
): string {
  if (typeof t === 'function') return t(key, fallback, params);
  return formatFallback(fallback, params);
}

export function runEnemyTurn({
  sr,
  safeTo,
  rand,
  randInt,
  chance,
  sfx,
  setSealedTurns,
  setSealedMove,
  setBossPhase,
  setBossTurn,
  setBossCharging,
  setBText,
  setPhase,
  setEAnim,
  setPAnim,
  setPHp,
  setPHpSub,
  setSpecDef,
  setDefAnim,
  setEHp,
  setEffMsg,
  setCursed,
  addD,
  addP,
  _endSession,
  setScreen,
  handleVictory,
  handlePlayerPartyKo,
  t,
}: RunEnemyTurnArgs): void {
  const loseToGameOver = (message = tr(t, 'battle.ally.ko', 'Your partner has fallen...')): void => {
    _endSession(false);
    setPhase('ko');
    setBText(message);
    setScreen('gameover');
  };

  const tryReturnToBattleMenu = (): void => {
    tryReturnToMenu(() => sr.current, setPhase, setBText);
  };
  const isBattleActive = (): boolean => isBattleActiveState(sr.current);
  const safeToIfBattleActive = (fn: () => void, ms: number): void => (
    scheduleIfBattleActive(safeTo, () => sr.current, fn, ms)
  );

  const resolvePlayerTarget = (s: BattleRuntimeState): TargetSlot => {
    const targets: TargetSlot[] = [];
    if ((s.pHp || 0) > 0) targets.push('main');
    if (s.allySub && (s.pHpSub || 0) > 0) targets.push('sub');
    if (targets.length <= 0) return 'main';
    return targets[randInt(0, targets.length - 1)];
  };

  const applyDamageToTarget = ({ s, target, dmg, label = null, color = '#ef4444' }: ApplyDamageArgs): number => {
    const isSub = target === 'sub';
    const prevHp = isSub ? (s.pHpSub || 0) : (s.pHp || 0);
    const nextHp = Math.max(0, prevHp - dmg);
    if (isSub) {
      setPHpSub(nextHp);
    } else {
      setPHp(nextHp);
      setPAnim('playerHit 0.5s ease');
      safeToIfBattleActive(() => setPAnim(''), 500);
    }
    addD(label || `-${dmg}`, isSub ? 112 : 60, isSub ? 146 : 170, color);
    return nextHp;
  };

  const maybeEnemyAssistAttack = (delayMs = 850): boolean => {
    const s = sr.current;
    if (!s.enemySub || !s.starter) return false;
    if (!chance(TRAIT_BALANCE.enemy.assistAttackChance)) return false;

    safeToIfBattleActive(() => {
      if (!isBattleActive()) return;
      const s2 = sr.current;
      if (!s2.enemySub || !s2.starter) {
        tryReturnToBattleMenu();
        return;
      }
      setBText(tr(t, 'battle.enemy.assistAttack', '⚔️ {enemy} launched an assist attack!', { enemy: s2.enemySub.name || 'Enemy' }));
      setPhase('enemyAtk');
      effectOrchestratorTyped.runEnemyLunge({
        safeTo,
        setEAnim,
        strikeDelay: 380,
        onStrike: () => {
          if (!isBattleActive()) return;
          const s3 = sr.current;
          if (!s3.enemySub || !s3.starter) {
            tryReturnToBattleMenu();
            return;
          }
          const target = resolvePlayerTarget(s3);
          const targetName = target === 'sub' ? (s3.allySub?.name || tr(t, 'battle.role.sub', 'Sub')) : (s3.starter.name || tr(t, 'battle.role.main', 'Main'));
          const defenderType = target === 'sub' ? (s3.allySub?.type || s3.starter.type) : s3.starter.type;
          const { dmg } = resolveEnemyAssistStrike({
            enemySub: s3.enemySub,
            starterType: defenderType,
          });
          const nh = applyDamageToTarget({
            s: s3,
            target,
            dmg,
            label: `✶-${dmg}`,
            color: '#f97316',
          });
          sfx.play('playerHit');
          addP('enemy', 84, 186, 3);
          if (nh <= 0) {
            safeToIfBattleActive(() => {
              sfx.play('ko');
              if (handlePlayerPartyKo) {
                handlePlayerPartyKo({
                  target,
                  reason: tr(t, 'battle.ko.doubleFocus', '{name} was knocked out by a double focus attack...', { name: targetName }),
                });
              } else {
                loseToGameOver(tr(t, 'battle.ko.doubleFocus.generic', 'Your partner was knocked out by a double focus attack...'));
              }
            }, 650);
            return;
          }
          safeToIfBattleActive(() => {
            tryReturnToBattleMenu();
          }, 650);
        },
      });
    }, delayMs);

    return true;
  };

  function doEnemyAttack(bp: number): void {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    setBText(tr(t, 'battle.enemy.attackStart', '{enemy} attacks!', { enemy: s.enemy.name || 'Enemy' }));
    setPhase('enemyAtk');
    effectOrchestratorTyped.runEnemyLunge({
      safeTo,
      setEAnim,
      onStrike: () => {
        if (!isBattleActive()) return;
        const s2 = sr.current;
        const target = resolvePlayerTarget(s2);
        const targetName = target === 'sub' ? (s2.allySub?.name || tr(t, 'battle.role.sub', 'Sub')) : (s2.starter?.name || tr(t, 'battle.role.main', 'Main'));
        const defenderType = target === 'sub' ? (s2.allySub?.type || s2.starter?.type) : s2.starter?.type;
        if (target === 'main' && s2.specDef) {
          const st = s2.starter?.type || 'grass';
          setSpecDef(false);
          setDefAnim(st);
          if (st === 'fire') {
            setBText(tr(t, 'battle.specdef.fire.block', '🛡️ Barrier blocked the attack!'));
            addD('🛡️BLOCK', 60, 170, '#fbbf24');
            addP('starter', 50, 170, 6);
            safeToIfBattleActive(() => {
              setDefAnim(null);
              tryReturnToBattleMenu();
            }, 1800);
          } else if (st === 'water') {
            setPAnim('dodgeSlide 0.9s ease');
            setBText(tr(t, 'battle.specdef.water.dodge', '💨 Perfect dodge!'));
            addD('MISS!', 60, 170, '#38bdf8');
            safeToIfBattleActive(() => {
              setPAnim('');
              setDefAnim(null);
              tryReturnToBattleMenu();
            }, 1800);
          } else if (st === 'electric') {
            setBText(tr(t, 'battle.specdef.electric.stun', '⚡ Electric stun! Enemy cannot move!'));
            addD(tr(t, 'battle.pvp.tag.paralyze', '⚡Paralyzed'), 60, 170, '#fbbf24');
            setEAnim('enemyElecHit 0.6s ease');
            addP('electric', 155, 80, 5);
            safeToIfBattleActive(() => {
              setEAnim('');
              setDefAnim(null);
              setBText(tr(t, 'battle.enemy.paralyzedSkip', '⚡ {enemy} is paralyzed and cannot attack!', { enemy: sr.current.enemy?.name || 'Enemy' }));
              setPhase('text');
              safeToIfBattleActive(() => {
                tryReturnToBattleMenu();
              }, 1500);
            }, 1800);
          } else if (st === 'light') {
            const roarDmg = 15;
            const nh = Math.max(0, sr.current.eHp - roarDmg);
            setEHp(nh);
            setBText(tr(t, 'battle.specdef.light.roarCounter', "✨ Lion's roar! Blocked and countered!"));
            addD('🛡️BLOCK', 60, 170, '#f59e0b');
            addP('starter', 50, 170, 6);
            sfx.play('light');
            safeToIfBattleActive(() => {
              addD(`-${roarDmg}`, 155, 50, '#f59e0b');
              setEAnim('enemyFireHit 0.6s ease');
              addP('starter', 155, 80, 5);
            }, 500);
            safeToIfBattleActive(() => {
              setEAnim('');
              setDefAnim(null);
              if (nh <= 0) safeToIfBattleActive(() => handleVictory(tr(t, 'battle.victory.verb.lionRoar', "was defeated by lion's roar")), 500);
              else {
                tryReturnToBattleMenu();
              }
            }, 1800);
          } else {
            const rawDmg = Math.round((s2.enemy?.atk || 0) * (
              DAMAGE_BALANCE.enemyAttackVariance.min
              + rand() * (DAMAGE_BALANCE.enemyAttackVariance.max - DAMAGE_BALANCE.enemyAttackVariance.min)
            ));
            const refDmg = Math.round(rawDmg * TRAIT_BALANCE.specDef.grassReflectScale);
            const nh = Math.max(0, sr.current.eHp - refDmg);
            setEHp(nh);
            setBText(tr(t, 'battle.specdef.grass.reflect', '🌿 Reflected attack!'));
            addD('🛡️BLOCK', 60, 170, '#22c55e');
            safeToIfBattleActive(() => {
              addD(`-${refDmg}`, 155, 50, '#22c55e');
              setEAnim('enemyGrassHit 0.6s ease');
              addP('starter', 155, 80, 5);
            }, 500);
            safeToIfBattleActive(() => {
              setEAnim('');
              setDefAnim(null);
              if (nh <= 0) safeToIfBattleActive(() => handleVictory(tr(t, 'battle.victory.verb.reflected', 'was defeated by reflected damage')), 500);
              else {
                tryReturnToBattleMenu();
              }
            }, 1800);
          }
          return;
        }

        const {
          trait,
          scaledAtk,
          isBlaze,
          isCrit,
          defEff,
          dmg,
        } = resolveEnemyPrimaryStrike({
          enemy: s2.enemy,
          enemyHp: s2.eHp,
          starterType: defenderType,
          bossPhase: bp,
          chance,
        });
        const nh = applyDamageToTarget({
          s: s2,
          target,
          dmg,
          label: isCrit ? `💥-${dmg}` : `-${dmg}`,
          color: isCrit ? '#ff6b00' : '#ef4444',
        });
        sfx.play('playerHit');
        addP('enemy', 80, 190, 4);
        if (isCrit) {
          setEffMsg({ text: tr(t, 'battle.enemy.effect.crit', '🔥 Critical!'), color: '#ff6b00' });
          safeToIfBattleActive(() => setEffMsg(null), 1500);
        } else if (isBlaze) {
          setEffMsg({ text: tr(t, 'battle.enemy.effect.blazeAwaken', '🔥 Blaze awakened! ATK↑'), color: '#ef4444' });
          safeToIfBattleActive(() => setEffMsg(null), 1500);
        } else if (defEff > 1) {
          sfx.play('effective');
          setEffMsg({ text: tr(t, 'battle.enemy.effect.super', 'Enemy move is super effective!'), color: '#ef4444' });
          safeToIfBattleActive(() => setEffMsg(null), 1500);
        } else if (defEff < 1) {
          sfx.play('resist');
          setEffMsg({ text: tr(t, 'battle.enemy.effect.notVery', 'Enemy move is not very effective'), color: '#64748b' });
          safeToIfBattleActive(() => setEffMsg(null), 1500);
        }

        if (nh <= 0) {
          safeToIfBattleActive(() => {
            sfx.play('ko');
            if (handlePlayerPartyKo) {
              handlePlayerPartyKo({ target, reason: tr(t, 'battle.ko.fallen', '{name} has fallen...', { name: targetName }) });
            } else {
              loseToGameOver();
            }
          }, 800);
          return;
        }

        if (trait === 'tenacity') {
          const heal = Math.round((s2.enemy?.maxHp || 0) * TRAIT_BALANCE.enemy.tenacityHealRatio);
          const newEHp = Math.min(sr.current.eHp + heal, s2.enemy?.maxHp || sr.current.eHp + heal);
          safeToIfBattleActive(() => {
            setEHp(newEHp);
            addD(`+${heal}`, 155, 50, '#3b82f6');
            setBText(tr(t, 'battle.enemy.tenacityHeal', '💧 {enemy} recovered HP!', { enemy: s2.enemy?.name || 'Enemy' }));
          }, 600);
        }

        if (trait === 'curse' && chance(TRAIT_BALANCE.enemy.curseApplyChance)) {
          setCursed(true);
          safeToIfBattleActive(() => {
            addD(tr(t, 'battle.tag.curse', '💀Curse'), 60, 140, '#a855f7');
            setBText(tr(t, 'battle.enemy.curseApplied', "💀 {enemy}'s curse weakens your next attack!", { enemy: s2.enemy?.name || 'Enemy' }));
          }, 600);
        }

        if (trait === 'swift' && chance(TRAIT_BALANCE.enemy.swiftExtraAttackChance)) {
          safeToIfBattleActive(() => {
            if (!isBattleActive()) return;
            setBText(tr(t, 'battle.enemy.swiftExtra', '⚡ {enemy} attacks again!', { enemy: s2.enemy?.name || 'Enemy' }));
            effectOrchestratorTyped.runEnemyLunge({
              safeTo,
              setEAnim,
              onStrike: () => {
                if (!isBattleActive()) return;
                const s3 = sr.current;
                const target2 = resolvePlayerTarget(s3);
                const target2Name = target2 === 'sub' ? (s3.allySub?.name || tr(t, 'battle.role.sub', 'Sub')) : (s3.starter?.name || tr(t, 'battle.role.main', 'Main'));
                const defenderType2 = target2 === 'sub' ? (s3.allySub?.type || s3.starter?.type) : s3.starter?.type;
                const dmg2 = calcEnemyDamageTyped(scaledAtk, getEffTyped(s3.enemy?.mType, defenderType2));
                const nh2 = applyDamageToTarget({
                  s: s3,
                  target: target2,
                  dmg: dmg2,
                  label: `⚡-${dmg2}`,
                  color: '#eab308',
                });
                sfx.play('playerHit');
                addP('enemy', 80, 190, 3);
                if (nh2 <= 0) {
                  safeToIfBattleActive(() => {
                    sfx.play('ko');
                    if (handlePlayerPartyKo) {
                      handlePlayerPartyKo({ target: target2, reason: tr(t, 'battle.ko.comboDown', '{name} was knocked out by combo hits...', { name: target2Name }) });
                    } else {
                      loseToGameOver();
                    }
                  }, 800);
                } else {
                  if (maybeEnemyAssistAttack(500)) return;
                  safeToIfBattleActive(() => {
                    tryReturnToBattleMenu();
                  }, 800);
                }
              },
            });
          }, 1000);
          return;
        }

        if (maybeEnemyAssistAttack(900)) return;
        safeToIfBattleActive(() => {
          tryReturnToBattleMenu();
        }, 800);
      },
    });
  }

  function doEnemyTurnInner(): void {
    if (!isBattleActive()) return;
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    const bossState = resolveBossTurnState({
      enemy: s.enemy,
      eHp: s.eHp,
      bossTurn: s.bossTurn,
      bossCharging: s.bossCharging,
      sealedMove: s.sealedMove,
    });
    const { isBoss, phase: bp, nextBossTurn, bossEvent } = bossState;
    if (isBoss) setBossTurn(nextBossTurn);

    if (bossEvent === 'release') {
      setBossCharging(false);
      setBText(tr(t, 'battle.boss.release', '💀 Dark Dragon King unleashes dark breath!'));
      sfx.play('bossBoom');
      setPhase('enemyAtk');
      effectOrchestratorTyped.runEnemyLunge({
        safeTo,
        setEAnim,
        onStrike: () => {
          if (!isBattleActive()) return;
          const s2 = sr.current;
          const target = resolvePlayerTarget(s2);
          const targetName = target === 'sub' ? (s2.allySub?.name || tr(t, 'battle.role.sub', 'Sub')) : (s2.starter?.name || tr(t, 'battle.role.main', 'Main'));
          const bigDmg = Math.round((s2.enemy?.atk || 0) * TRAIT_BALANCE.boss.releaseAttackScale);
          const nh = applyDamageToTarget({
            s: s2,
            target,
            dmg: bigDmg,
            label: `💀-${bigDmg}`,
            color: '#a855f7',
          });
          addP('enemy', 80, 190, 6);
          if (nh <= 0) {
            safeToIfBattleActive(() => {
              if (handlePlayerPartyKo) {
                handlePlayerPartyKo({ target, reason: tr(t, 'battle.ko.bossBreath', '{name} was knocked out by dark breath...', { name: targetName }) });
              } else {
                loseToGameOver();
              }
            }, 800);
          } else {
            safeToIfBattleActive(() => {
              tryReturnToBattleMenu();
            }, 800);
          }
        },
      });
      return;
    }

    if (bossEvent === 'start_charge') {
      setBossCharging(true);
      sfx.play('bossCharge');
      setBText(tr(t, 'battle.boss.charge', '⚠️ Dark Dragon King is charging! It will unleash a big move next turn!'));
      setPhase('text');
      setEAnim('bossShake 0.5s ease infinite');
      safeToIfBattleActive(() => {
        if (!isBattleActive()) return;
        tryReturnToBattleMenu();
        setEAnim('');
      }, 2000);
      return;
    }

    if (bossEvent === 'seal_move') {
      const sealIdx = randInt(0, TRAIT_BALANCE.boss.sealMoveIndexMax);
      setSealedMove(sealIdx);
      sfx.play('seal');
      const sealTurns = TRAIT_BALANCE.boss.sealDurationTurns;
      setSealedTurns(sealTurns);
      const moveName = s.starter.moves?.[sealIdx]?.name || '???';
      setBText(tr(t, 'battle.boss.sealMove', '💀 Dark Dragon King sealed your "{move}"! ({turns} turns)', { move: moveName, turns: sealTurns }));
      setPhase('text');
      safeToIfBattleActive(() => {
        if (!isBattleActive()) return;
        doEnemyAttack(bp);
      }, 1500);
      return;
    }

    doEnemyAttack(bp);
  }

  const s = sr.current;
  if (!s.enemy || !s.starter) return;
  if (!isBattleActive()) return;
  const isBoss = s.enemy.id === 'boss';

  if (isBoss && s.sealedTurns > 0) {
    const nt = s.sealedTurns - 1;
    setSealedTurns(nt);
    if (nt <= 0) setSealedMove(-1);
  }

  if (isBoss) {
    const newPhase = computeBossPhaseTyped(s.eHp, s.enemy.maxHp || 1);
    if (newPhase !== s.bossPhase) {
      setBossPhase(newPhase);
      const phaseMsg = newPhase === 2 ? tr(t, 'battle.boss.phase2', '💀 Dark Dragon King entered rage state! ATK increased!')
        : newPhase === 3 ? tr(t, 'battle.boss.phase3', '💀 Dark Dragon King awakened! Final stand!')
          : '';
      if (phaseMsg) {
        setBText(phaseMsg);
        setPhase('text');
        setEAnim('bossShake 0.5s ease');
        safeToIfBattleActive(() => setEAnim(''), 600);
        safeToIfBattleActive(() => {
          if (!isBattleActive()) return;
          doEnemyTurnInner();
        }, 1500);
        return;
      }
    }
  }

  doEnemyTurnInner();
}
