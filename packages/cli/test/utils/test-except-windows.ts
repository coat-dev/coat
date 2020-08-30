export const testExceptWindows =
  process.platform === "win32" ? test.skip : test;
