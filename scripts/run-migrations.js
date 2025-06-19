const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/models');

async function runMigrations() {
  try {
    console.log('🔄 Запуск миграций...');

    const migrationsDir = path.join(__dirname, '../src/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 Папка migrations не найдена, создаём...');
      fs.mkdirSync(migrationsDir, { recursive: true });
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📄 Найдено ${migrationFiles.length} миграций`);

    for (const file of migrationFiles) {
      console.log(`⚡ Выполняем миграцию: ${file}`);
      
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Разбиваем на отдельные команды (по точке с запятой)
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        try {
          await sequelize.query(command);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
          console.log(`   ⚠️ Объект уже существует (пропускаем): ${error.message}`);
        }
      }
      
      console.log(`   ✅ Миграция ${file} выполнена`);
    }

    console.log('🎉 Все миграции выполнены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка выполнения миграций:', error);
    throw error;
  }
}

// Если скрипт запущен напрямую
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Миграции завершены');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ошибка:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations }; 