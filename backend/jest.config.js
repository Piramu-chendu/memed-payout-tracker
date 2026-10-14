
/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: ["<rootDir>/src", "<rootDir>/tests"],

  testMatch: [
    "**/*.test.ts",
    "**/*.spec.ts",
  ],

  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],

  moduleFileExtensions: [
    "ts",
    "js",
    "json",
  ],

  setupFiles: [
    "<rootDir>/tests/jest.setup.ts",
  ],

  clearMocks: true,
};
