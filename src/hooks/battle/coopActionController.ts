import {
  handleCoopPartyKo,
  runCoopAllySupportTurn,
} from './coopFlow.ts';

type HandleCoopPartyKoArgs = Parameters<typeof handleCoopPartyKo>[0];
type RunCoopAllySupportTurnArgs = Parameters<typeof runCoopAllySupportTurn>[0];

type RunPlayerPartyKoControllerArgs = Omit<HandleCoopPartyKoArgs, 'state'> & {
  sr: { current: HandleCoopPartyKoArgs['state'] };
};

/**
 * runPlayerPartyKoController
 *
 * Resolves latest battle state from stateRef and delegates KO handling.
 */
export function runPlayerPartyKoController({
  sr,
  ...rest
}: RunPlayerPartyKoControllerArgs): ReturnType<typeof handleCoopPartyKo> {
  return handleCoopPartyKo({
    ...rest,
    state: sr.current,
  });
}

/**
 * runAllySupportTurnController
 *
 * Small pass-through wrapper for ally support turn execution.
 */
export function runAllySupportTurnController(
  args: RunCoopAllySupportTurnArgs,
): ReturnType<typeof runCoopAllySupportTurn> {
  return runCoopAllySupportTurn(args);
}
