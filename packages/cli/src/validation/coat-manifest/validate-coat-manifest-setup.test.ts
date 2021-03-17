/* eslint-disable @typescript-eslint/no-empty-function */
import chalk from "chalk";
import { CoatManifestTask } from "../../types/coat-manifest-tasks";
import { ValidationIssueType } from "../validation-issue";
import { validateCoatManifestSetup } from "./validate-coat-manifest-setup";

describe("validation/coat-manifest/validate-coat-manifest-name", () => {
  test("should return no issues for an empty setup array", () => {
    const setup: CoatManifestTask[] = [];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(0);
  });

  test("should not return any issues for valid tasks", () => {
    const setup: CoatManifestTask[] = [
      {
        id: "task1",
        run: async () => ({}),
      },
      {
        id: "task2",
        run: () => ({}),
        shouldRun: () => false,
        local: false,
      },
      {
        id: "task3",
        run: () => ({}),
        local: true,
        runOnCi: true,
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(0);
  });

  test.each`
    setup       | description
    ${123}      | ${"number"}
    ${true}     | ${"boolean"}
    ${{}}       | ${"object"}
    ${() => {}} | ${"function"}
    ${"setup"}  | ${"string"}
    ${null}     | ${"null"}
  `(
    "should return an issue for an invalid setup property - $description",
    ({ setup }) => {
      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green setup:} must be an array.`,
          propertyPath: ["setup"],
          shortMessage: "must be an array.",
        },
      ]);
    }
  );

  test.each`
    setup         | description
    ${[123]}      | ${"number"}
    ${[true]}     | ${"boolean"}
    ${[[]]}       | ${"array"}
    ${[() => {}]} | ${"function"}
    ${["task"]}   | ${"string"}
    ${[null]}     | ${"null"}
  `(
    "should return an issue for an invalid task entry - $description",
    ({ setup }) => {
      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green setup[0]:} must be an object.`,
          propertyPath: ["setup", 0],
          shortMessage: "must be an object.",
        },
      ]);
    }
  );

  test.each`
    setup                                | description
    ${[{ id: 123, run: () => {} }]}      | ${"number"}
    ${[{ id: true, run: () => {} }]}     | ${"boolean"}
    ${[{ id: [], run: () => {} }]}       | ${"array"}
    ${[{ id: {}, run: () => {} }]}       | ${"object"}
    ${[{ id: () => {}, run: () => {} }]} | ${"function"}
    ${[{ id: null, run: () => {} }]}     | ${"null"}
    ${[{ id: "", run: () => {} }]}       | ${"empty string"}
  `(
    "should return an issue for an invalid task id - $description",
    ({ setup }) => {
      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green setup[0].id:} must be a non-empty string.`,
          propertyPath: ["setup", 0, "id"],
          shortMessage: "must be a non-empty string.",
        },
      ]);
    }
  );

  test("should return an issue for a missing task id - with a suggestion", () => {
    const setup: CoatManifestTask[] = [
      {
        run: () => {},
        // @ts-expect-error Typo to provoke suggestion
        ID: "test-id",
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green setup[0].id:} must be a non-empty string. Did you misspell {magenta ID}?`,
        propertyPath: ["setup", 0, "ID"],
        shortMessage: chalk`did you mean to write {magenta id}?`,
      },
    ]);
  });

  test("should return an issue for a missing task id - without a suggestion", () => {
    const setup: CoatManifestTask[] = [
      {
        run: () => {},
        // @ts-expect-error Unknown property
        else: "test-id",
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      type: ValidationIssueType.Error,
      message: chalk`{green setup[0]:} must have a {magenta id} property with a non-empty string.`,
      propertyPath: ["setup", 0],
      shortMessage: chalk`must have a {magenta id} property with a non-empty string.`,
    });
    expect(issues).toContainEqual({
      type: ValidationIssueType.Warning,
      message: chalk`{green setup[0].else:} Unknown property.`,
      propertyPath: ["setup", 0, "else"],
    });
  });

  test.each`
    setup                         | description
    ${[{ id: "id", run: 123 }]}   | ${"number"}
    ${[{ id: "id", run: true }]}  | ${"boolean"}
    ${[{ id: "id", run: [] }]}    | ${"array"}
    ${[{ id: "id", run: {} }]}    | ${"object"}
    ${[{ id: "id", run: null }]}  | ${"null"}
    ${[{ id: "id", run: "run" }]} | ${"string"}
  `(
    "should return an issue for an invalid run property - $description",
    ({ setup }) => {
      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green setup[0].run:} must be a function.`,
          propertyPath: ["setup", 0, "run"],
          shortMessage: "must be a function.",
        },
      ]);
    }
  );

  test("should return an issue for a missing task run function - with a suggestion", () => {
    const setup: CoatManifestTask[] = [
      {
        id: "test-id",
        // @ts-expect-error Typo to provoke suggestion
        Run: () => {},
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green setup[0].run:} must be a function. Did you misspell {magenta Run}?`,
        propertyPath: ["setup", 0, "Run"],
        shortMessage: chalk`did you mean to write {magenta run}?`,
      },
    ]);
  });

  test("should return an issue for a missing task run function - without a suggestion", () => {
    const setup: CoatManifestTask[] = [
      {
        id: "test-id",
        // @ts-expect-error Unknown property
        else: () => {},
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      type: ValidationIssueType.Error,
      message: chalk`{green setup[0]:} must have a {magenta run} property with a function.`,
      propertyPath: ["setup", 0],
      shortMessage: chalk`must have a {magenta run} property with a function.`,
    });
    expect(issues).toContainEqual({
      type: ValidationIssueType.Warning,
      message: chalk`{green setup[0].else:} Unknown property.`,
      propertyPath: ["setup", 0, "else"],
    });
  });

  test.each`
    setup                                             | description
    ${[{ id: "id", run: () => {}, local: 123 }]}      | ${"number"}
    ${[{ id: "id", run: () => {}, local: [] }]}       | ${"array"}
    ${[{ id: "id", run: () => {}, local: () => {} }]} | ${"function"}
    ${[{ id: "id", run: () => {}, local: {} }]}       | ${"object"}
    ${[{ id: "id", run: () => {}, local: null }]}     | ${"null"}
    ${[{ id: "id", run: () => {}, local: "local" }]}  | ${"string"}
  `(
    "should return an issue for an invalid local property - $description",
    ({ setup }) => {
      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green setup[0].local:} must be a boolean.`,
          propertyPath: ["setup", 0, "local"],
          shortMessage: "must be a boolean.",
        },
      ]);
    }
  );

  test.each`
    setup                                                    | description
    ${[{ id: "id", run: () => {}, shouldRun: 123 }]}         | ${"number"}
    ${[{ id: "id", run: () => {}, shouldRun: [] }]}          | ${"array"}
    ${[{ id: "id", run: () => {}, shouldRun: true }]}        | ${"boolean"}
    ${[{ id: "id", run: () => {}, shouldRun: {} }]}          | ${"object"}
    ${[{ id: "id", run: () => {}, shouldRun: null }]}        | ${"null"}
    ${[{ id: "id", run: () => {}, shouldRun: "shouldRun" }]} | ${"string"}
  `(
    "should return an issue for an invalid shouldRun property - $description",
    ({ setup }) => {
      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green setup[0].shouldRun:} must be a function.`,
          propertyPath: ["setup", 0, "shouldRun"],
          shortMessage: "must be a function.",
        },
      ]);
    }
  );

  test("should return an issue for an unknown property - with a suggestion for local", () => {
    const setup: CoatManifestTask[] = [
      {
        id: "test-id",
        run: () => {},
        // @ts-expect-error Typo to provoke suggestion
        locall: true,
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green setup[0].locall:} Unknown property. Did you mean {magenta local}?`,
        propertyPath: ["setup", 0, "locall"],
      },
    ]);
  });

  test("should return an issue for an unknown property - with a suggestion for shouldRun", () => {
    const setup: CoatManifestTask[] = [
      {
        id: "test-id",
        run: () => {},
        // @ts-expect-error Typo to provoke suggestion
        shouldrun: () => true,
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green setup[0].shouldrun:} Unknown property. Did you mean {magenta shouldRun}?`,
        propertyPath: ["setup", 0, "shouldrun"],
      },
    ]);
  });

  test("should return an issue for an unknown property - without a suggestion", () => {
    const setup: CoatManifestTask[] = [
      {
        id: "test-id",
        run: () => {},
        // @ts-expect-error Unknown property
        else: "else",
      },
    ];

    const issues = [...validateCoatManifestSetup(setup)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green setup[0].else:} Unknown property.`,
        propertyPath: ["setup", 0, "else"],
      },
    ]);
  });

  describe("local tasks", () => {
    test.each`
      setup                                                            | description
      ${[{ id: "id", run: () => {}, local: true, runOnCi: 123 }]}      | ${"number"}
      ${[{ id: "id", run: () => {}, local: true, runOnCi: [] }]}       | ${"number"}
      ${[{ id: "id", run: () => {}, local: true, runOnCi: () => {} }]} | ${"number"}
      ${[{ id: "id", run: () => {}, local: true, runOnCi: {} }]}       | ${"number"}
      ${[{ id: "id", run: () => {}, local: true, runOnCi: null }]}     | ${"number"}
      ${[{ id: "id", run: () => {}, local: true, runOnCi: "true" }]}   | ${"number"}
    `(
      "should return an issue for an invalid runOnCi property - $description",
      ({ setup }) => {
        const issues = [...validateCoatManifestSetup(setup)];

        expect(issues).toHaveLength(1);
        expect(issues).toEqual([
          {
            type: ValidationIssueType.Error,
            message: chalk`{green setup[0].runOnCi:} must be a boolean.`,
            propertyPath: ["setup", 0, "runOnCi"],
            shortMessage: "must be a boolean.",
          },
        ]);
      }
    );

    test("should return an issue for an unknown property - with a suggestion for runOnCi", () => {
      const setup: CoatManifestTask[] = [
        {
          id: "test-id",
          run: () => {},
          local: true,
          // @ts-expect-error Typo to provoke suggestion
          runOnCI: () => true,
        },
      ];

      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Warning,
          message: chalk`{green setup[0].runOnCI:} Unknown property. Did you mean {magenta runOnCi}?`,
          propertyPath: ["setup", 0, "runOnCI"],
        },
      ]);
    });
  });

  describe("global tasks", () => {
    test("should return a warning for a runOnCi property", () => {
      const setup: CoatManifestTask[] = [
        {
          id: "test-id",
          run: () => {},
          runOnCi: true,
        },
      ];

      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Warning,
          message: chalk`{green setup[0].runOnCi:} is only used for local tasks, since global tasks are never run on CI.`,
          propertyPath: ["setup", 0, "runOnCi"],
        },
      ]);
    });

    test("should return an issue for an unknown property - without a suggestion for runOnCi", () => {
      const setup: CoatManifestTask[] = [
        {
          id: "test-id",
          run: () => {},
          // @ts-expect-error Typo to provoke suggestion (although suggestion is not desired in this case)
          runOnCI: () => true,
        },
      ];

      const issues = [...validateCoatManifestSetup(setup)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Warning,
          message: chalk`{green setup[0].runOnCI:} Unknown property.`,
          propertyPath: ["setup", 0, "runOnCI"],
        },
      ]);
    });
  });
});
