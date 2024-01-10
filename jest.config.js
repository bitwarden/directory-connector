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

  testEnvironment: "jsdom",
  testMatch: ["**/+(*.)+(spec).+(ts)"],

  roots: ["<rootDir>"],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
  setupFilesAfterEnv: ["<rootDir>/test.setup.ts"],
  maxWorkers: 3,

  transform: {
    "^.+\\.tsx?$": [
      "jest-preset-angular",
      // 'ts-jest',
      {
        ...defaultTransformerOptions,
        isolatedModules: true,
        tsconfig: "./tsconfig.json",
        astTransformers: {
          before: ["./es2020-transformer.ts"],
        },
      },
    ],
  },
};
