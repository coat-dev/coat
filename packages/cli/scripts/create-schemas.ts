import path from "path";
import fs from "fs-extra";
import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone";
import { buildGenerator, programFromConfig } from "typescript-json-schema";

async function main(): Promise<void> {
  const cliRoot = path.join(__dirname, "..");

  const program = programFromConfig(path.join(cliRoot, "tsconfig.json"));

  const schemaId = "coat-validators";
  const generator = buildGenerator(program, { id: schemaId });

  if (!generator) {
    throw new Error("Could not create schema generator");
  }

  const schemaTypes = ["CoatLocalLockfile", "CoatGlobalLockfile"];
  const schema = generator.getSchemaForSymbols(schemaTypes);

  const ajv = new Ajv({ code: { source: true } });
  ajv.addSchema(schema);

  const validators = schemaTypes.reduce<Record<string, string>>((map, type) => {
    // eslint-disable-next-line no-param-reassign
    map[`validate${type}`] = `${schemaId}#/definitions/${type}`;
    return map;
  }, {});

  const moduleCode = standaloneCode(ajv, validators);

  const generatedCodeDir = path.join(cliRoot, "build", "generated");
  await fs.outputFile(path.join(generatedCodeDir, "validators.js"), moduleCode);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
