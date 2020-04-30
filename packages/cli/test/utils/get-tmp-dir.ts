import tmp from "tmp";

const removeCallbacks: (() => void)[] = [];

export function cleanupTmpDirs(): void {
  removeCallbacks.forEach((callback) => {
    callback();
  });
}

export function getTmpDir(): string {
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  removeCallbacks.push(tmpDir.removeCallback);
  return tmpDir.name;
}
