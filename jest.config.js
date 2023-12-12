const { pathsToModuleNameMapper } = require("ts-jest");

const { compilerOptions } = require("./tsconfig");

/** @type {import('jest').Config} */
module.exports = {
  reporters: ["default", "jest-junit"],

  collectCoverage: true,
  coverageReporters: ["html", "lcov"],
  coverageDirectory: "coverage",

  moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
    prefix: "<rootDir>/",
  }),
  projects: [
    "<rootDir>/jslib/angular/jest.config.js",
    "<rootDir>/jslib/common/jest.config.js",
    "<rootDir>/jslib/electron/jest.config.js",
    "<rootDir>/jslib/node/jest.config.js",
  ],

  // Workaround for a memory leak that crashes tests in CI:
  // https://github.com/facebook/jest/issues/9430#issuecomment-1149882002
  // Also anecdotally improves performance when run locally
  maxWorkers: 3,
};
