import execa from "execa";

export async function getPackageVersion(
  packageName: string,
  cwd: string
): Promise<string> {
  const { stdout } = await execa(
    "node",
    ["-e", `console.log(require('${packageName}/package.json').version)`],
    { cwd }
  );
  return stdout;
}
