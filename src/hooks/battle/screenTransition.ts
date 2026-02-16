type ClearTimer = () => void;
type InvalidateAsyncWork = () => void;
type SetScreenState = (nextScreen: string) => void;

type RunScreenTransitionArgs = {
  prevScreen: string | undefined;
  nextScreen: string;
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
