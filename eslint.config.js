import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        // Добавляем глобальные переменные для проекта
        express: 'readonly',
        moment: 'readonly',
        bcrypt: 'readonly',
        jwt: 'readonly',
        redis: 'readonly',
        winston: 'readonly',
        axios: 'readonly',
        path: 'readonly',
        fs: 'readonly',
        os: 'readonly',
        csv: 'readonly',
        ExcelJS: 'readonly',
        TelegramBot: 'readonly',
        // Константы проекта
        LIMITS: 'readonly',
        HTTP_STATUS_CODES: 'readonly',
        TIME_CONSTANTS: 'readonly'
      },
      ecmaVersion: 2022,
      sourceType: 'commonjs'
    },
    rules: {
      // Отключаем console для production
      'no-console': 'warn',
      
      // Запрещаем неиспользуемые переменные (более мягкие правила)
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        caughtErrors: 'none'
      }],
      
      // Требуем использования строгого режима
      'strict': ['error', 'global'],
      
      // Безопасность
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // Качество кода
      'eqeqeq': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      
      // Более мягкие правила для магических чисел
      'no-magic-numbers': ['warn', { 
        ignore: [0, 1, -1, 100, 60, 300, 1024, 2, 5, 10, 12, 15, 25, 30, 480, 60000],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true
      }],
      
      // Отключаем некоторые строгие правила для разработки
      'no-case-declarations': 'warn',
      'no-undef': 'warn' // Временно делаем предупреждением
    }
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'no-undef': 'off'
    }
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
      'no-undef': 'off'
    }
  },
  {
    files: ['src/telegram/**/*.js'],
    rules: {
      'no-magic-numbers': 'off',
      'no-undef': 'warn'
    }
  },
  {
    files: ['src/services/**/*.js'],
    rules: {
      'no-undef': 'warn'
    }
  }
]; 