import type { ScreenName } from '../../types/battle';

type ClearTimer = () => void;
type InvalidateAsyncWork = () => void;
type SetScreenState = (nextScreen: ScreenName) => void;

type RunScreenTransitionArgs = {
  prevScreen: ScreenName | undefined;
  nextScreen: ScreenName;
  clearTimer: ClearTimer;
  invalidateAsyncWork: InvalidateAsyncWork;
  setScreenState: SetScreenState;
};

export function shouldInvalidateAsyncOnScreenChange(
  prevScreen: unknown,
  nextScreen: unknown,
): boolean {
  return prevScreen === 'battle' && nextScreen !== 'battle';
}

export function runScreenTransition({
  prevScreen,
  nextScreen,
  clearTimer,
  invalidateAsyncWork,
  setScreenState,
}: RunScreenTransitionArgs): void {
  if (shouldInvalidateAsyncOnScreenChange(prevScreen, nextScreen)) {
    clearTimer();
    invalidateAsyncWork();
  }
  setScreenState(nextScreen);
}
