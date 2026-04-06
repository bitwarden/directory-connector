const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "jest-preset-angular",

  reporters: ["default", "jest-junit"],

  collectCoverage: true,
  // Ensure we collect coverage from files without tests
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["html", "lcov"],
  coverageDirectory: "coverage",

  testEnvironment: "jsdom",
  testMatch: ["**/+(*.)+(spec).+(ts)"],
  // Integration tests require external infrastructure (LDAP docker, Google Workspace credentials).
  // Run them separately with: npm run test:integration
  testPathIgnorePatterns: ["\\.integration\\.spec\\.ts$"],

  roots: ["<rootDir>"],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
  setupFilesAfterEnv: ["<rootDir>/test.setup.ts"],
  // Workaround for a memory leak that crashes tests in CI:
  // https://github.com/facebook/jest/issues/9430#issuecomment-1149882002
  // Also anecdotally improves performance when run locally
  maxWorkers: 3,

  transform: {
    "^.+\\.(ts|js|mjs|html|svg)$": [
      "jest-preset-angular",
      {
        tsconfig: "./tsconfig.spec.json",
        stringifyContentPathRegex: "\\.(html|svg)$",
        // Further workaround for memory leak, recommended here:
        // https://github.com/kulshekhar/ts-jest/issues/1967#issuecomment-697494014
        // Makes tests run faster and reduces size/rate of leak, but loses typechecking on test code
        // See https://bitwarden.atlassian.net/browse/EC-497 for more info
        isolatedModules: true,
      },
    ],
  },
};
