module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/', '/__tests__/integration/'],
    testTimeout: 30000,
    forceExit: true,
    verbose: true,
    transform: {
        '^.+\\.js$': 'babel-jest'
    }
};
