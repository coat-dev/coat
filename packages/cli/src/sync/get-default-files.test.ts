import { getDefaultFiles } from "./get-default-files";

describe("sync/get-default-files", () => {
  test("should add .gitignore with node_modules and .coat entries", () => {
    expect(getDefaultFiles()).toMatchInlineSnapshot(`
      Array [
        Object {
          "content": "node_modules

      # coat local files
      /.coat
      ",
          "file": ".gitignore",
          "once": true,
          "type": "TEXT",
        },
      ]
    `);
  });
});
