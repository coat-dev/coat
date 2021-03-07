import fs from "fs-extra";
import { vol } from "memfs";
import {
  COAT_GLOBAL_LOCKFILE_SCHEMA,
  COAT_LOCAL_LOCKFILE_SCHEMA,
} from "../constants";
import {
  getCoatGlobalLockfileValidator,
  getCoatLocalLockfileValidator,
} from "./get-validator";

jest.mock("fs");

describe("util/get-validator", () => {
  const testSchema = {
    $id: "https://example.com/product.schema.json",
    title: "Product",
    type: "object",
    properties: {
      productId: {
        description: "The unique identifier for a product",
        type: "integer",
      },
    },
    required: ["productId"],
  };
  const validObject = {
    productId: 123,
  };
  const invalidObject = {
    productId: "123",
  };

  afterEach(() => {
    vol.reset();
  });

  test.each`
    schema                  | schemaPath                     | getValidatorFunction
    ${"CoatGlobalLockfile"} | ${COAT_GLOBAL_LOCKFILE_SCHEMA} | ${getCoatGlobalLockfileValidator}
    ${"CoatLocalLockfile"}  | ${COAT_LOCAL_LOCKFILE_SCHEMA}  | ${getCoatLocalLockfileValidator}
  `(
    "should return the validator function for the schema: $schema",
    async ({ schemaPath, getValidatorFunction }) => {
      await fs.outputFile(schemaPath, JSON.stringify(testSchema));
      const validate = await getValidatorFunction();

      expect(validate(validObject)).toBe(true);
      expect(validate(invalidObject)).toBe(false);
    }
  );

  test("should reuse a validator across function invocations", async () => {
    await fs.outputFile(
      COAT_GLOBAL_LOCKFILE_SCHEMA,
      JSON.stringify(testSchema)
    );
    let validate = await getCoatGlobalLockfileValidator();

    validate(invalidObject);
    const errors = validate.errors;
    expect(errors).toHaveLength(1);

    validate = await getCoatGlobalLockfileValidator();

    expect(errors).toBe(validate.errors);
  });
});
