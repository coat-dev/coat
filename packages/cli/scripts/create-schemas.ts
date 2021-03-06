import path from "path";
import fs from "fs-extra";
import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone";
import { createGenerator, Config } from "ts-json-schema-generator";

async function main(): Promise<void> {
  const cliRoot = path.join(__dirname, "..");

  const schemaId = "coat-validators";

  const config: Config = {
    path: path.join(__dirname, "..", "src", "types", "coat-lockfiles.ts"),
    tsconfig: path.join(__dirname, "..", "tsconfig.json"),
    type: "*",
    additionalProperties: false,
    skipTypeCheck: true,
    schemaId,
  };
  const schema = createGenerator(config).createSchema(config.type);

  const schemaTypes = ["CoatLocalLockfile", "CoatGlobalLockfile"];

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
