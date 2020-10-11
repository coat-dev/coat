module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["text"],
  modulePathIgnorePatterns: ["<rootDir>/build"],
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
};
