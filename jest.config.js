module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^common(.*)$': '<rootDir>/src/common$1',
    '^connectors(.*)$': '<rootDir>/src/connectors$1',
    '^definitions(.*)$': '<rootDir>/src/definitions$1',
    '^mutations(.*)$': '<rootDir>/src/mutations$1',
    '^queries(.*)$': '<rootDir>/src/queries$1',
  },
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/db/testSetup.js',
  globalTeardown: '<rootDir>/db/testTeardown.js',
  coverageDirectory: './coverage/',
  collectCoverage: true,
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  testTimeout: 30000,
}
