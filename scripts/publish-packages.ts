import { promises as fs } from "fs";
import path from "path";
import execa from "execa";
import prompts from "prompts";
import prettier from "prettier";

enum Package {
  Cli = "cli",
  TemplateTsPackage = "template-ts-package",
}

enum VersionIncrement {
  Minor = "minor",
  Patch = "patch",
}

async function publishCli(): Promise<void> {
  const { updateType } = await prompts([
    {
      name: "updateType",
      type: "select",
      message: "Select the update type for @coat/cli",
      choices: [
        {
          title: "Patch",
          value: VersionIncrement.Patch,
        },
        {
          title: "Minor",
          value: VersionIncrement.Minor,
        },
      ],
    },
  ]);

  // Increment the version for @coat/cli
  const cliDir = path.join(__dirname, "..", "packages", "cli");
  console.log("Running npm version %s in packages/cli", updateType);
  await execa("npm", ["version", updateType], {
    cwd: cliDir,
    stdio: "inherit",
  });

  // Retrieve the new version from cli/package.json
  const cliPackageJsonRaw = await fs.readFile(
    path.join(cliDir, "package.json"),
    "utf-8"
  );
  const { version: newCliVersion } = JSON.parse(cliPackageJsonRaw);

  // Publish the package to npm
  console.log("Running npm publish in packages/cli");
  await execa("npm", ["publish"], {
    cwd: cliDir,
    stdio: "inherit",
  });

  // Update the version of cli in template-ts-package
  const templateTsPackagePackageJsonPath = path.join(
    __dirname,
    "..",
    "packages",
    "template-ts-package",
    "package.json"
  );
  const templateTsPackagePackageJsonRaw = await fs.readFile(
    templateTsPackagePackageJsonPath,
    "utf-8"
  );
  const templateTsPackagePackageJson = JSON.parse(
    templateTsPackagePackageJsonRaw
  );
  // Update dependency entries
  templateTsPackagePackageJson.peerDependencies[
    "@coat/cli"
  ] = `^${newCliVersion}`;
  templateTsPackagePackageJson.devDependencies["@coat/cli"] = newCliVersion;
  // Polish package.json with prettier
  const newTemplateTsPackagePackageJson = prettier.format(
    JSON.stringify(templateTsPackagePackageJson),
    { filepath: templateTsPackagePackageJsonPath }
  );
  // Update file
  await fs.writeFile(
    templateTsPackagePackageJsonPath,
    newTemplateTsPackagePackageJson
  );

  // Create a git commit and tag
  await execa("git", ["add", "--all"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  await execa(
    "git",
    ["commit", "-m", `chore: :bookmark: @coat/cli@${newCliVersion}`],
    {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    }
  );
  await execa("git", ["tag", `@coat/cli-v${newCliVersion}`], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
}

async function publishTemplateTsPackage(): Promise<void> {
  const { updateType } = await prompts([
    {
      name: "updateType",
      type: "select",
      message: "Select the update type for @coat/template-ts-package",
      choices: [
        {
          title: "Patch",
          value: VersionIncrement.Patch,
        },
        {
          title: "Minor",
          value: VersionIncrement.Minor,
        },
      ],
    },
  ]);

  // Increment the version for @coat/template-ts-package
  const templateTsPackageDir = path.join(
    __dirname,
    "..",
    "packages",
    "template-ts-package"
  );
  console.log(
    "Running npm version %s in packages/template-ts-package",
    updateType
  );
  await execa("npm", ["version", updateType], {
    cwd: templateTsPackageDir,
    stdio: "inherit",
  });

  // Retrieve the new version from cli/package.json
  const templateTsPackageJsonRaw = await fs.readFile(
    path.join(templateTsPackageDir, "package.json"),
    "utf-8"
  );
  const { version: newTemplateTsPackageVersion } = JSON.parse(
    templateTsPackageJsonRaw
  );

  // Publish the package to npm
  console.log("Running npm publish in packages/template-ts-package");
  await execa("npm", ["publish"], {
    cwd: templateTsPackageDir,
    stdio: "inherit",
  });

  // Create a git commit and tag
  await execa("git", ["add", "--all"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  await execa(
    "git",
    [
      "commit",
      "-m",
      `chore: :bookmark: @coat/template-ts-package@${newTemplateTsPackageVersion}`,
    ],
    {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    }
  );
  await execa(
    "git",
    ["tag", `@coat/template-ts-package-v${newTemplateTsPackageVersion}`],
    {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    }
  );
}

async function main(): Promise<void> {
  const { packages } = await prompts({
    name: "packages",
    type: "multiselect",
    message: "Select the packages you want to publish",
    choices: [
      {
        title: Package.Cli,
        value: Package.Cli,
      },
      {
        title: Package.TemplateTsPackage,
        value: Package.TemplateTsPackage,
      },
    ],
  });

  if (packages.includes(Package.Cli)) {
    await publishCli();
  }

  if (packages.includes(Package.TemplateTsPackage)) {
    await publishTemplateTsPackage();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
