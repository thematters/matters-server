export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/build/'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.js$',
  moduleFileExtensions: ['js', 'json'],
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/db/globalTestSetup.js',
  coverageDirectory: './coverage/',
  collectCoverage: true,
}
