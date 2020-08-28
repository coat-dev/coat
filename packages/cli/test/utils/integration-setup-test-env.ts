// Leave gracious timeout of 2 minutes per test

import { cleanupTmpDirs } from "./get-tmp-dir";

// to allow for network issues
jest.setTimeout(120000);

// Retry tests up to 3 times to counter flaky
// tests that rely on network connectivity
jest.retryTimes(3);

afterAll(() => {
  cleanupTmpDirs();
});

export default {};
