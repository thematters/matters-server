export default {
  testEnvironment: 'node',
  // preset: 'ts-jest',
  // roots: ['<rootDir>/src'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)x?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/db/globalTestSetup.js',
  globalTeardown: '<rootDir>/db/globalTestTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/db/afterEnvTestSetup.js'],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  // globals: {
  //   'ts-jest': {
  //     diagnostics: false,
  //   },
  // },
}
