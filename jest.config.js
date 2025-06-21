module.exports = {
  // Базовая директория для всех тестов
  roots: ['<rootDir>/tests'],

  // Файлы тестов
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],

  // Трансформация TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Настройка покрытия кода
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/migrations/**',
    '!src/config/**',
    '!src/types/**',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Настройка окружения
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Модули и алиасы
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Игнорируемые пути
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Таймаут для тестов
  testTimeout: 10000,

  // Параллельное выполнение тестов
  maxWorkers: '50%',

  // Вывод информации о тестах
  verbose: true,
  
  // Очистка моков
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}; 