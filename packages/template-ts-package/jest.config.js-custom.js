module.exports = `
module.exports = {
  collectCoverage: true,
  modulePathIgnorePatterns: ["<rootDir>/build"],
  collectCoverageFrom: ["src/**/*.ts"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/files/"],
  coverageReporters: ["text"],
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
};
`;
