import type { Config } from 'jest';

const config: Config = {
  cacheDirectory: '.jest/cache',
  collectCoverage: false,
  collectCoverageFrom: ['**/*.ts', '!**/node_modules/**'],
  coverageDirectory: '.jest/coverage',
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  preset: 'ts-jest',
  testRegex: '(/__tests__/.*|(\\.|/)(test))\\.ts$',
};

export default config;
