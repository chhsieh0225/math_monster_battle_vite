import {
  runHandleFreezeController,
  runQuitGameController,
  runToggleCoopActiveController,
} from './gameLifecycleController.ts';
import {
  runAllySupportTurnController,
  runPlayerPartyKoController,
} from './coopActionController.ts';

type RunQuitGameControllerArgs = Parameters<typeof runQuitGameController>[0];
type RunToggleCoopActiveControllerArgs = Parameters<typeof runToggleCoopActiveController>[0];
type RunHandleFreezeControllerArgs = Parameters<typeof runHandleFreezeController>[0];
type RunPlayerPartyKoControllerArgs = Parameters<typeof runPlayerPartyKoController>[0];
type RunAllySupportTurnControllerArgs = Parameters<typeof runAllySupportTurnController>[0];

type RunQuitGameControllerFn = (args: RunQuitGameControllerArgs) => void;
type RunToggleCoopActiveControllerFn = (args: RunToggleCoopActiveControllerArgs) => void;
type RunHandleFreezeControllerFn = (args: RunHandleFreezeControllerArgs) => void;
type RunPlayerPartyKoControllerFn = (
  args: RunPlayerPartyKoControllerArgs,
) => ReturnType<typeof runPlayerPartyKoController>;
type RunAllySupportTurnControllerFn = (
  args: RunAllySupportTurnControllerArgs,
) => ReturnType<typeof runAllySupportTurnController>;

type RunPlayerPartyKoBaseArgs = Omit<RunPlayerPartyKoControllerArgs, 'target' | 'reason'>;
type RunPlayerPartyKoOptions = Pick<RunPlayerPartyKoControllerArgs, 'target' | 'reason'>;
type RunAllySupportTurnBaseArgs = Omit<RunAllySupportTurnControllerArgs, 'delayMs' | 'onDone'>;
type RunAllySupportTurnOptions = Pick<RunAllySupportTurnControllerArgs, 'delayMs' | 'onDone'>;

export function runQuitGameWithContext(
  args: RunQuitGameControllerArgs,
  runner: RunQuitGameControllerFn = runQuitGameController,
): void {
  runner(args);
}

export function runToggleCoopActiveWithContext(
  args: RunToggleCoopActiveControllerArgs,
  runner: RunToggleCoopActiveControllerFn = runToggleCoopActiveController,
): void {
  runner(args);
}

export function runHandleFreezeWithContext(
  args: RunHandleFreezeControllerArgs,
  runner: RunHandleFreezeControllerFn = runHandleFreezeController,
): void {
  runner(args);
}

export function runPlayerPartyKoWithContext(
  base: RunPlayerPartyKoBaseArgs,
  options: RunPlayerPartyKoOptions,
  runner: RunPlayerPartyKoControllerFn = runPlayerPartyKoController,
): ReturnType<typeof runPlayerPartyKoController> {
  return runner({
    ...base,
    target: options.target,
    reason: options.reason,
  });
}

export function runAllySupportTurnWithContext(
  base: RunAllySupportTurnBaseArgs,
  options: RunAllySupportTurnOptions = {},
  runner: RunAllySupportTurnControllerFn = runAllySupportTurnController,
): ReturnType<typeof runAllySupportTurnController> {
  return runner({
    ...base,
    delayMs: options.delayMs,
    onDone: options.onDone,
  });
}
