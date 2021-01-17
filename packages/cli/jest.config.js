const sharedConfig = {
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
};

const unitTestsProject = {
  ...sharedConfig,
  displayName: "Unit tests",
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/test/"],
};

const e2eTestsProject = {
  ...sharedConfig,
  displayName: "E2E tests",
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/"],
  globalSetup: "./test/utils/e2e-setup.ts",
  globalTeardown: "./test/utils/e2e-teardown.ts",
  setupFilesAfterEnv: ["./test/utils/e2e-setup-test-env.ts"],
};

let projectsToRun = [unitTestsProject, e2eTestsProject];
const projectToRun = projectsToRun.find(
  (project) => project.displayName === process.env.JEST_PROJECT
);
if (projectToRun) {
  projectsToRun = [projectToRun];
}

// Set npm log level to notice, in case it is silenced
// by coat run
process.env.npm_config_loglevel = "notice";

module.exports = {
  projects: projectsToRun,
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
  coverageReporters: ["text"],

  // Workaround to test e2e tests
  // with VSCode test explorer jest test adapter:
  //
  // globalSetup and globalTeardown are only considered
  // if they are top-level properties and not inside projects.
  // In order to test the e2e tests with these extensions
  // uncomment these lines below:
  // globalSetup: "./test/utils/e2e-setup.ts",
  // globalTeardown: "./test/utils/e2e-teardown.ts",
  // setupFilesAfterEnv: ["./test/utils/e2e-setup-test-env.ts"],
};
