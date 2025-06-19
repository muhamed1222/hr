#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Запуск админ-панели...');

const vite = spawn('npx', ['vite', '--port', '5173', '--host'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

vite.on('error', (err) => {
  console.error('❌ Ошибка запуска:', err);
});

vite.on('close', (code) => {
  console.log(`📝 Процесс завершен с кодом ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n⏹️ Остановка сервера...');
  vite.kill();
  process.exit(0);
}); 