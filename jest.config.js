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
    '^@root(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/db/globalTestSetup.js',
  coverageDirectory: './coverage/',
  collectCoverage: true,
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '.+\\.tsx?$': ['ts-jest', {//the content you'd placed at "global"
      // babel: true, tsConfig: 'tsconfig.json',
      useESM: true,
    }],
    // 'node_modules/kubo-rpc-client',
    // "node_modules/kubo-rpc-client/.+\\.(j|t)sx?$": ["ts-jest", { useESM: true, }],
  },
  transformIgnorePatterns: [
    // '<rootDir>/node_modules/',
    "node_modules/(?!kubo-rpc-client/.*)"
  ],
}
