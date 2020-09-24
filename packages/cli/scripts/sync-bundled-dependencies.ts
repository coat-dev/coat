/**
 * This script retrieves all dependencies from @coat/cli and adds
 * them to npm's "bundledDependencies" property.
 *
 * Since one of the core use cases is to generate new projects with
 * the cli, a fast install speed creates a better user experience.
 *
 * One of the ways to quickly add a new project without installing
 * @coat/cli locally is to run
 *
 * `npx @coat/cli create template`
 *
 * which is faster when only the @coat/cli package itself has to be
 * retrieved instead of all nested dependencies.
 *
 */
import { promises as fs } from "fs";
import path from "path";
import prettier from "prettier";
import { PackageJson } from "type-fest";

const packageJsonPath = path.join(__dirname, "..", "package.json");

async function main(): Promise<void> {
  const packageJsonRaw = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonRaw) as PackageJson;

  // Add all dependency names to bundledDependencies
  packageJson.bundledDependencies = Object.keys(
    packageJson.dependencies || {}
  ).sort();

  // Prettify package.json
  const packageJsonResult = prettier.format(JSON.stringify(packageJson), {
    filepath: packageJsonPath,
  });
  await fs.writeFile(packageJsonPath, packageJsonResult);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
