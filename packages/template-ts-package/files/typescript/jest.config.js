module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["text"],
  modulePathIgnorePatterns: ["<rootDir>/build"],
  preset: "ts-jest",
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
};
