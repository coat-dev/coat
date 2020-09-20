const sharedConfig = {
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
};

const unitTestsProject = {
  ...sharedConfig,
  displayName: "Unit tests",
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/test/"],
};

const integrationTestsProject = {
  ...sharedConfig,
  displayName: "Integration tests",
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/"],
  globalSetup: "./test/utils/integration-setup.ts",
  globalTeardown: "./test/utils/integration-teardown.ts",
  setupFilesAfterEnv: ["./test/utils/integration-setup-test-env.ts"],
};

let projectsToRun = [unitTestsProject, integrationTestsProject];
const projectToRun = projectsToRun.find(
  (project) => project.displayName === process.env.JEST_PROJECT
);
if (projectToRun) {
  projectsToRun = [projectToRun];
}

module.exports = {
  projects: projectsToRun,
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
  coverageReporters: ["text"],

  // Workaround to test integration tests
  // with VSCode test explorer jest test adapter:
  //
  // globalSetup and globalTeardown are only considered
  // if they are top-level properties and not inside projects.
  // In order to test the integration tests with these extensions
  // uncomment these lines below:
  // globalSetup: "./test/utils/integration-setup.ts",
  // globalTeardown: "./test/utils/integration-teardown.ts",
};
