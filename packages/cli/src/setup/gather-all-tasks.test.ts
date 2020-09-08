import { CoatManifestStrict } from "../types/coat-manifest";
import { CoatTaskType } from "../types/coat-manifest-tasks";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { gatherAllTasks } from "./gather-all-tasks";

describe("setup/gather-all-tasks", () => {
  test("should work with an empty tasks array", () => {
    expect(gatherAllTasks([])).toEqual([]);
  });

  test("should work with only global tasks", () => {
    const templates: CoatManifestStrict[] = [
      getStrictCoatManifest({
        name: "test-1",
        setup: [
          {
            id: "1",
            run: function run1() {
              return {};
            },
          },
          {
            id: "2",
            run: function run2() {
              return { hi: true };
            },
          },
        ],
      }),
    ];
    expect(gatherAllTasks(templates)).toEqual([
      {
        id: "1",
        type: CoatTaskType.Global,
        run: templates[0].setup[0].run,
      },
      {
        id: "2",
        type: CoatTaskType.Global,
        run: templates[0].setup[1].run,
      },
    ]);
  });

  test("should work with only local tasks", () => {
    const templates: CoatManifestStrict[] = [
      getStrictCoatManifest({
        name: "test-1",
        setup: [
          {
            id: "1",
            run: function run1() {
              return {};
            },
            local: true,
          },
          {
            id: "2",
            run: function run2() {
              return { hi: true };
            },
            local: true,
          },
        ],
      }),
    ];
    expect(gatherAllTasks(templates)).toEqual([
      {
        id: "1",
        type: CoatTaskType.Local,
        run: templates[0].setup[0].run,
      },
      {
        id: "2",
        type: CoatTaskType.Local,
        run: templates[0].setup[1].run,
      },
    ]);
  });

  test("should merge global tasks", () => {
    const templates: CoatManifestStrict[] = [
      getStrictCoatManifest({
        name: "test-1",
        setup: [
          {
            id: "1",
            run: function run1() {
              return {};
            },
          },
          {
            id: "2",
            run: function run2() {
              return { hi: true };
            },
          },
          {
            id: "1",
            run: function run3() {
              return { 3: true };
            },
          },
        ],
      }),
    ];
    expect(gatherAllTasks(templates)).toEqual([
      {
        id: "1",
        type: CoatTaskType.Global,
        run: templates[0].setup[2].run,
      },
      {
        id: "2",
        type: CoatTaskType.Global,
        run: templates[0].setup[1].run,
      },
    ]);
  });

  test("should merge local tasks", () => {
    const templates: CoatManifestStrict[] = [
      getStrictCoatManifest({
        name: "test-1",
        setup: [
          {
            id: "1",
            local: true,
            run: function run1() {
              return {};
            },
          },
          {
            id: "2",
            local: true,
            run: function run2() {
              return { hi: true };
            },
          },
          {
            id: "1",
            local: true,
            run: function run3() {
              return { 3: true };
            },
          },
        ],
      }),
    ];
    expect(gatherAllTasks(templates)).toEqual([
      {
        id: "1",
        type: CoatTaskType.Local,
        run: templates[0].setup[2].run,
      },
      {
        id: "2",
        type: CoatTaskType.Local,
        run: templates[0].setup[1].run,
      },
    ]);
  });

  test("should not merge global and local tasks", () => {
    const templates: CoatManifestStrict[] = [
      getStrictCoatManifest({
        name: "test-1",
        setup: [
          {
            id: "1",
            local: true,
            run: function run1() {
              return {};
            },
          },
          {
            id: "2",
            local: true,
            run: function run2() {
              return { hi: true };
            },
          },
          {
            id: "1",
            local: false,
            run: function run3() {
              return { 3: true };
            },
          },
        ],
      }),
    ];
    expect(gatherAllTasks(templates)).toEqual([
      {
        id: "1",
        type: CoatTaskType.Global,
        run: templates[0].setup[2].run,
      },
      {
        id: "1",
        type: CoatTaskType.Local,
        run: templates[0].setup[0].run,
      },
      {
        id: "2",
        type: CoatTaskType.Local,
        run: templates[0].setup[1].run,
      },
    ]);
  });
});
