import path from "path";
import fs from "fs-extra";
import { buildGenerator, programFromConfig } from "typescript-json-schema";

const cliRoot = path.join(__dirname, "..");
const schemasDir = path.join(cliRoot, "src", "generated", "schemas");
const schemaTypes = ["CoatLocalLockfile", "CoatGlobalLockfile"];

async function main(): Promise<void> {
  const program = programFromConfig(path.join(cliRoot, "tsconfig.json"));
  const generator = buildGenerator(program);

  await Promise.all(
    schemaTypes.map(async (typeName) => {
      const schema = generator?.getSchemaForSymbol(typeName);
      await fs.outputFile(
        path.join(schemasDir, `${typeName}.json`),
        JSON.stringify(schema)
      );
    })
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
