// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("memfs");

fs.realpath.native = jest.fn();

module.exports = fs;

export default {};
