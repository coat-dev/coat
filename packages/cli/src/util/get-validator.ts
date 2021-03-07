import fs from "fs-extra";
import Ajv from "ajv";
import {
  COAT_GLOBAL_LOCKFILE_SCHEMA,
  COAT_LOCAL_LOCKFILE_SCHEMA,
} from "../constants";

const compiledValidators: Record<string, Ajv.ValidateFunction> = {};

/**
 * Creates a ajv validator function from a JSON schema file or returns
 * a previously compiled instance.
 *
 * @param schemaPath The path to the JSON schema file
 * @returns An ajv validator function
 */
async function getValidator(schemaPath: string): Promise<Ajv.ValidateFunction> {
  if (compiledValidators[schemaPath]) {
    return compiledValidators[schemaPath];
  }

  const schemaRaw = await fs.readFile(schemaPath, "utf-8");
  const schema = JSON.parse(schemaRaw);

  const ajv = new Ajv();
  const validator = ajv.compile(schema);

  compiledValidators[schemaPath] = validator;

  return validator;
}

/**
 * Returns a JSON schema validator for a global coat lockfile
 */
export async function getCoatGlobalLockfileValidator(): Promise<Ajv.ValidateFunction> {
  return getValidator(COAT_GLOBAL_LOCKFILE_SCHEMA);
}

/**
 * Returns a JSON schema validator for a local coat lockfile
 */
export async function getCoatLocalLockfileValidator(): Promise<Ajv.ValidateFunction> {
  return getValidator(COAT_LOCAL_LOCKFILE_SCHEMA);
}
