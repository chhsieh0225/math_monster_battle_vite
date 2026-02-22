import assert from 'node:assert/strict';
import test from 'node:test';
import { coerceUseBattlePublicApi } from './publicApi.ts';
import {
  noop,
  noopNum,
  noopBool,
  noopAsync,
  noopUnsub,
} from './__testStubs.js';

function createValidPublicApi() {
  return {
    state: {
      screen: 'title',
      timedMode: false,
      phase: 'menu',
      battleMode: 'single',
      enemies: [],
      starter: null,
      allySub: null,
      pHp: 100,
      pHpSub: 0,
      pExp: 0,
      pLvl: 1,
      pStg: 0,
      coopActiveSlot: 'main',
      pvpStarter2: null,
      pvpHp2: 100,
      pvpTurn: 'p1',
      pvpWinner: null,
      pvpState: {
        p1: {
          charge: 0,
          burn: 0,
          freeze: false,
          static: 0,
          paralyze: false,
          combo: 0,
          specDef: false,
        },
        p2: {
          charge: 0,
          burn: 0,
          freeze: false,
          static: 0,
          paralyze: false,
          combo: 0,
          specDef: false,
        },
        turn: 'p1',
        winner: null,
        actionCount: 0,
      },
      pvpChargeP1: 0,
      pvpChargeP2: 0,
      pvpActionCount: 0,
      pvpBurnP1: 0,
      pvpBurnP2: 0,
      pvpFreezeP1: false,
      pvpFreezeP2: false,
      pvpStaticP1: 0,
      pvpStaticP2: 0,
      pvpParalyzeP1: false,
      pvpParalyzeP2: false,
      pvpComboP1: 0,
      pvpComboP2: 0,
      pvpSpecDefP1: false,
      pvpSpecDefP2: false,
      round: 0,
      enemy: null,
      eHp: 0,
      enemySub: null,
      eHpSub: 0,
      streak: 0,
      passiveCount: 0,
      charge: 0,
      tC: 0,
      tW: 0,
      wrongQuestions: [],
      defeated: 0,
      maxStreak: 0,
      mHits: [0, 0, 0, 0],
      mLvls: [1, 1, 1, 1],
      mLvlUp: null,
      selIdx: null,
      q: null,
      fb: null,
      bText: '',
      answered: false,
      dmgs: [],
      parts: [],
      eAnim: '',
      pAnim: '',
      atkEffect: null,
      effMsg: null,
      burnStack: 0,
      frozen: false,
      shattered: false,
      staticStack: 0,
      specDef: false,
      defAnim: null,
      cursed: false,
      bossPhase: 0,
      bossTurn: 0,
      bossCharging: false,
      sealedMove: -1,
      sealedTurns: 0,
      shadowShieldCD: -1,
      furyRegenUsed: false,
      diffLevel: 2,
      gamePaused: false,
      questionTimerSec: 8,
      dailyChallengeFeedback: null,
      towerChallengeFeedback: null,
      expNext: 30,
      chargeReady: false,
      inventory: { potion: 0, candy: 0, shield: 0 },
      achUnlocked: [],
      achPopup: null,
      collectionPopup: null,
      encData: { encountered: {}, defeated: {} },
    },
    actions: {
      dismissAch: noop,
      dismissCollectionPopup: noop,
      setTimedMode: noop,
      setBattleMode: noop,
      setScreen: noop,
      queueDailyChallenge: noop,
      queueTowerChallenge: noop,
      clearChallengeRun: noop,
      setStarter: noop,
      setPvpStarter2: noop,
      startGame: noop,
      selectMove: noop,
      useItem: noop,
      onAns: noop,
      advance: noop,
      continueAfterEvolve: noop,
      quitGame: noop,
      togglePause: noop,
      toggleCoopActive: noop,
      rmD: noop,
      rmP: noop,
      resumeFromSave: noop,
    },
    view: {
      timerSubscribe: noopUnsub,
      getTimerLeft: noopNum,
      getPow: noopNum,
      dualEff: () => 1,
      sfx: {
        sfxMuted: false,
        bgmMuted: false,
        bgmVolume: 0.24,
        muted: false,
        ready: true,
        init: noopAsync,
        setSfxMuted: noopBool,
        setBgmMuted: noopBool,
        setBgmVolume: () => 0.24,
        setMuted: noopBool,
        startBgm: noop,
        stopBgm: noop,
        prefetchBgm: noop,
        bgmTrack: null,
        dispose: noop,
      },
    },
  };
}

test('coerceUseBattlePublicApi keeps valid state/actions/view references', () => {
  const raw = createValidPublicApi();
  const api = coerceUseBattlePublicApi(raw);
  assert.equal(api.state, raw.state);
  assert.equal(api.actions, raw.actions);
  assert.equal(api.view, raw.view);
});

test('coerceUseBattlePublicApi throws when required action is missing', () => {
  const raw = createValidPublicApi();
  delete raw.actions.selectMove;
  assert.throws(
    () => coerceUseBattlePublicApi(raw),
    /publicApi\.actions\.selectMove/,
  );
});

test('coerceUseBattlePublicApi throws when required sfx method is missing', () => {
  const raw = createValidPublicApi();
  delete raw.view.sfx.startBgm;
  assert.throws(
    () => coerceUseBattlePublicApi(raw),
    /publicApi\.view\.sfx\.startBgm/,
  );
});
