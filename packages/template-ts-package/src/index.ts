import { promises as fs } from "fs";
import path from "path";
import {
  CoatManifestFile,
  CoatManifestFileType,
  CoatManifestScript,
  CoatTemplate,
} from "@coat/cli";

enum CompilerOption {
  TypeScript = "typescript",
  Babel = "babel",
}

interface TemplateConfig {
  compiler: CompilerOption;
}

const defaultConfig: TemplateConfig = {
  compiler: CompilerOption.TypeScript,
};

const filesDir = path.join(__dirname, "..", "files");

function getTemplateFile(
  filePath: string,
  type: CoatManifestFileType,
  { once, destinationPath }: { once?: boolean; destinationPath: string }
): CoatManifestFile {
  return {
    file: destinationPath,
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

const createTemplate: CoatTemplate = ({ coatContext, config: userConfig }) => {
  const config = {
    ...defaultConfig,
    ...userConfig,
  };

  // Add all files that are shared across both compiler options
  const files: CoatManifestFile[] = [
    getTemplateFile("shared/.eslintrc", CoatManifestFileType.Json, {
      destinationPath: ".eslintrc",
    }),
    getTemplateFile("shared/gitignore", CoatManifestFileType.Text, {
      destinationPath: ".gitignore",
    }),
    getTemplateFile("shared/tsconfig.json", CoatManifestFileType.Json, {
      destinationPath: "tsconfig.json",
    }),
    getTemplateFile("shared/tsconfig.build.json", CoatManifestFileType.Json, {
      destinationPath: "tsconfig.build.json",
    }),
    getTemplateFile("shared/jest.config.json", CoatManifestFileType.Json, {
      destinationPath: "jest.config.json",
    }),

    getTemplateFile("shared/src/index.ts", CoatManifestFileType.Text, {
      once: true,
      destinationPath: "src/index.ts",
    }),
    getTemplateFile("shared/src/index.test.ts", CoatManifestFileType.Text, {
      once: true,
      destinationPath: "src/index.test.ts",
    }),

    // README with the coat project's name
    {
      file: "README.md",
      type: CoatManifestFileType.Text,
      content: `# ${coatContext.coatManifest.name}`,
      once: true,
    },

    // Tell npm to only include build files in
    // the resulting package
    {
      file: "package.json",
      type: CoatManifestFileType.Json,
      content: {
        files: ["build/"],
      },
    },
  ];

  // Shared dependencies
  const devDependencies: Record<string, string> = {
    // Eslint
    eslint: "^7.13.0",
    "@typescript-eslint/eslint-plugin": "^4.8.1",
    "@typescript-eslint/parser": "^4.8.1",
    "eslint-config-prettier": "^6.15.0",

    // Jest
    jest: "^26.6.3",
    "@types/jest": "^26.0.15",
    "jest-circus": "^26.6.3",

    prettier: "^2.2.0",
    typescript: "~4.1.2",
    rimraf: "^3.0.2",
  };

  // Shared scripts
  const scripts: CoatManifestScript[] = [
    {
      id: "prebuild-clean",
      run: "rimraf build",
      scriptName: "prebuild",
    },
    {
      id: "lint-eslint",
      run: "eslint --ext .ts --max-warnings 0 src",
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
  ];

  switch (config.compiler) {
    case CompilerOption.TypeScript:
      // Files
      files.push(
        {
          file: "jest.config.json",
          content: {
            preset: "ts-jest",
          },
          type: CoatManifestFileType.Json,
        },
        {
          file: "tsconfig.json",
          // Node.js 10 compatibility
          // Update target once Node 10 is no longer supported
          content: { compilerOptions: { target: "ES2018" } },
          type: CoatManifestFileType.Json,
        }
      );

      // Dependencies
      //
      // Jest
      devDependencies["ts-jest"] = "^26.4.4";

      // Scripts
      scripts.push({
        id: "build-typescript",
        run: "tsc -p tsconfig.build.json",
        scriptName: "build",
      });
      break;
    case CompilerOption.Babel:
      // Files
      files.push(
        getTemplateFile("babel/.babelrc", CoatManifestFileType.Json, {
          destinationPath: ".babelrc",
        }),

        {
          file: "tsconfig.json",
          content: {
            compilerOptions: { target: "ESNext", isolatedModules: true },
          },
          type: CoatManifestFileType.Json,
        },
        {
          file: "tsconfig.build.json",
          content: {
            compilerOptions: {
              isolatedModules: false,
              emitDeclarationOnly: true,
            },
          },
          type: CoatManifestFileType.Json,
        }
      );

      // Dependencies
      //
      // Babel
      devDependencies["@babel/cli"] = "^7.12.1";
      devDependencies["@babel/core"] = "^7.12.3";
      devDependencies["@babel/preset-env"] = "^7.12.1";
      devDependencies["@babel/preset-typescript"] = "^7.12.1";

      // Scripts
      scripts.push(
        {
          id: "build-typedefs",
          run: "tsc -p tsconfig.build.json",
          scriptName: "build",
        },
        {
          id: "build-babel",
          run: 'babel src -d build --extensions ".ts" --ignore "**/*.test.ts"',
          scriptName: "build",
        }
      );
      break;
  }

  return {
    name: "@coat/template-ts-package",
    files,
    dependencies: { devDependencies },
    scripts,
  };
};

export default createTemplate;
