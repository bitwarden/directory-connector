const { pathsToModuleNameMapper } = require("ts-jest/utils");

const { compilerOptions } = require("./tsconfig");

module.exports = {
  collectCoverage: true,
  coverageReporters: ["html", "lcov"],
  coverageDirectory: "coverage",
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
    prefix: "<rootDir>/",
  }),
  projects: [
    "<rootDir>/angular/jest.config.js",
    "<rootDir>/common/jest.config.js",
    "<rootDir>/electron/jest.config.js",
    "<rootDir>/node/jest.config.js",
  ],
};
