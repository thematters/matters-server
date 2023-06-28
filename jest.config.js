module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^common/(.*)$': '<rootDir>/src/common/$1',
    '^connectors(.*)$': '<rootDir>/src/connectors$1',
    '^definitions(.*)$': '<rootDir>/src/definitions$1',
    '^mutations(.*)$': '<rootDir>/src/mutations$1',
    '^queries(.*)$': '<rootDir>/src/queries$1',
  },
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/db/globalTestSetup.js',
  globalTeardown: '<rootDir>/db/globalTestTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/db/afterEnvTestSetup.js'],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  workerIdleMemoryLimit: '4GB',
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
}
