"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
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
exports.default = config;
