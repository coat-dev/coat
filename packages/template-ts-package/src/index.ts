import { promises as fs } from "fs";
import path from "path";
import {
  CoatManifest,
  CoatManifestFile,
  CoatManifestFileType,
  CoatContext,
} from "@coat/cli";

const filesDir = path.join(__dirname, "..", "files");

function getTemplateFile(
  filePath: string,
  type: CoatManifestFileType,
  { once, destinationPath }: { once?: boolean; destinationPath?: string } = {
    once: false,
  }
): CoatManifestFile {
  return {
    file: destinationPath || filePath,
    content: async () => {
      const fileRaw = await fs.readFile(path.join(filesDir, filePath), "utf-8");
      switch (type) {
        case CoatManifestFileType.Json:
          return JSON.parse(fileRaw);
        case CoatManifestFileType.Text:
          return fileRaw;
      }
    },
    type,
    once,
  };
}

export default function createTemplate(context: CoatContext): CoatManifest {
  return {
    name: "@coat/template-ts-package",
    files: [
      getTemplateFile(".babelrc", CoatManifestFileType.Json),
      getTemplateFile(".eslintrc", CoatManifestFileType.Json),
      getTemplateFile("gitignore", CoatManifestFileType.Text, {
        destinationPath: ".gitignore",
      }),
      getTemplateFile("jest.config.js", CoatManifestFileType.Text),
      getTemplateFile("tsconfig.json", CoatManifestFileType.Json),
      getTemplateFile("tsconfig.build.json", CoatManifestFileType.Json),

      getTemplateFile("src/index.ts", CoatManifestFileType.Text, {
        once: true,
      }),
      getTemplateFile("src/index.test.ts", CoatManifestFileType.Text, {
        once: true,
      }),

      // README with the coat project's name
      {
        file: "README.md",
        type: CoatManifestFileType.Text,
        content: `# ${context.coatManifest.name}`,
        once: true,
      },

      // Tell npm to only include build files in
      // the resulting package
      {
        file: "package.json",
        type: CoatManifestFileType.Json,
        content: (source) => ({
          ...source,
          files: ["build/"],
        }),
      },
    ],
    dependencies: {
      devDependencies: {
        // Babel
        "@babel/cli": "^7.11.6",
        "@babel/core": "^7.11.6",
        "@babel/preset-env": "^7.11.5",
        "@babel/preset-typescript": "^7.10.4",

        // Eslint
        eslint: "^7.8.1",
        "@typescript-eslint/eslint-plugin": "^4.0.1",
        "@typescript-eslint/parser": "^4.0.1",
        "eslint-config-prettier": "6.11.0",

        // Jest
        jest: "^26.4.2",
        "@types/jest": "^26.0.13",
        "babel-jest": "^26.3.0",
        "jest-circus": "^26.4.2",

        prettier: "^2.1.1",
        typescript: "^4.0.2",
        rimraf: "^3.0.2",
      },
    },
    scripts: [
      {
        id: "build-typedefs",
        run: "tsc -p tsconfig.build.json --declaration --emitDeclarationOnly",
        scriptName: "build",
      },
      {
        id: "build-babel",
        run:
          'babel src -d build --extensions ".ts,.tsx" --ignore "**/*.test.ts,**/*.test.tsx"',
        scriptName: "build",
      },
      {
        id: "prebuild-clean",
        run: "rimraf build",
        scriptName: "prebuild",
      },
      {
        id: "lint-eslint",
        run: 'eslint "src/**/*.{ts,tsx}" --max-warnings 0',
        scriptName: "lint",
      },
      {
        id: "lint-prettier",
        run: "prettier --check src",
        scriptName: "lint",
      },
      {
        id: "lint-types",
        run: "tsc",
        scriptName: "lint",
      },
      {
        id: "test",
        run: "jest",
        scriptName: "test",
      },
      {
        id: "prepare-sync-and-build",
        run: "coat sync && coat run build",
        scriptName: "prepare",
      },
    ],
  };
}
