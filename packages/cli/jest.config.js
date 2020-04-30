const sharedConfig = {};

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
};
