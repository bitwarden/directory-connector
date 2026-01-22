const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

const tsPreset = require("ts-jest/jest-preset");
const angularPreset = require("jest-preset-angular/jest-preset");
const { defaultTransformerOptions } = require("jest-preset-angular/presets");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // ...tsPreset,
  // ...angularPreset,
  preset: "jest-preset-angular",

  reporters: ["default", "jest-junit"],

  collectCoverage: true,
  // Ensure we collect coverage from files without tests
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["html", "lcov"],
  coverageDirectory: "coverage",

  testEnvironment: "jsdom",
  testMatch: ["**/+(*.)+(spec).+(ts)"],

  roots: ["<rootDir>"],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
    // ESM compatibility: mock import.meta.url for tests
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test.setup.ts"],
  // Workaround for a memory leak that crashes tests in CI:
  // https://github.com/facebook/jest/issues/9430#issuecomment-1149882002
  // Also anecdotally improves performance when run locally
  maxWorkers: 3,

  // ESM support
  extensionsToTreatAsEsm: [".ts"],

  transform: {
    "^.+\\.tsx?$": [
      "jest-preset-angular",
      // 'ts-jest',
      {
        ...defaultTransformerOptions,
        tsconfig: "./tsconfig.json",
        // Further workaround for memory leak, recommended here:
        // https://github.com/kulshekhar/ts-jest/issues/1967#issuecomment-697494014
        // Makes tests run faster and reduces size/rate of leak, but loses typechecking on test code
        // See https://bitwarden.atlassian.net/browse/EC-497 for more info
        isolatedModules: true,
        // ESM support
        useESM: true,
      },
    ],
  },
};
