import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      ecmaVersion: 2022,
      sourceType: 'commonjs'
    },
    rules: {
      // Отключаем console для production
      'no-console': 'warn',
      
      // Запрещаем неиспользуемые переменные
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
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
      'no-magic-numbers': ['warn', { 
        ignore: [0, 1, -1, 100],
        ignoreArrayIndexes: true 
      }]
    }
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      'no-console': 'off',
      'no-magic-numbers': 'off'
    }
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off'
    }
  }
]; 