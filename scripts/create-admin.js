require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models');

async function createAdmin() {
  try {
    console.log('👨‍💼 Создание/обновление администратора...');
    
    // Проверяем подключение к базе данных
    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');
    
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (adminPassword === 'admin123') {
      console.warn('⚠️  ВНИМАНИЕ: Используется пароль по умолчанию! Обязательно смените его в production!');
    }
    
    // Проверяем, существует ли уже админ
    let admin = await User.findOne({
      where: { username: adminUsername }
    });
    
    // Хешируем пароль
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    if (admin) {
      // Обновляем существующего админа
      await admin.update({
        role: 'admin',
        status: 'active',
        passwordHash: passwordHash,
        name: admin.name || 'Администратор',
        lastLogin: null
      });
      console.log('✅ Администратор обновлен');
    } else {
      // Создаем нового админа
      admin = await User.create({
        username: adminUsername,
        name: 'Администратор',
        role: 'admin',
        status: 'active',
        passwordHash: passwordHash
      });
      console.log('✅ Новый администратор создан');
    }
    
    console.log(`🔑 Данные для входа:`);
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ID: ${admin.id}`);
    
    console.log('🎉 Настройка администратора завершена!');
    console.log('⚠️  Не забудьте сменить пароль после первого входа через /api/auth/change-password');
    
  } catch (error) {
    console.error('❌ Ошибка создания админа:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Запускаем создание админа
createAdmin().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
}); 