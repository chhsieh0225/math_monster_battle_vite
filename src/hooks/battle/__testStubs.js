/** Shared no-op stubs for tests — reduces V8 function count in coverage. */
export const noop = () => {};
export const noopNum = () => 0;
export const noopBool = () => false;
export const noopNull = () => null;
export const noopArr = () => [];
export const noopStr = () => '';
export const noopAsync = async () => {};
export const noopUnsub = () => noop;
export const noopObj = () => ({});
