// https://jestjs.io/docs/27.x/ecmascript-modules
export default {
  transform: {},
  // preset: 'ts-jest',
  // roots: ['<rootDir>/src'],
  maxWorkers: '50%',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // moduleNameMapper: {
  //   '^common(.*)$': '<rootDir>/src/common$1',
  //   '^connectors(.*)$': '<rootDir>/src/connectors$1',
  //   '^definitions(.*)$': '<rootDir>/src/definitions$1',
  //   '^mutations(.*)$': '<rootDir>/src/mutations$1',
  //   '^queries(.*)$': '<rootDir>/src/queries$1',
  // },
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
