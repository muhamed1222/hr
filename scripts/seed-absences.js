const { sequelize, User, Absence, Team, UserTeam } = require('../src/models');
const moment = require('moment');

/**
 * Скрипт для создания тестовых заявок на отсутствие
 */
async function seedAbsences() {
  try {
    console.log('🌱 Создание тестовых заявок на отсутствие...');

    // Получаем пользователей
    const users = await User.findAll({
      where: { status: 'active' },
      limit: 10
    });

    if (users.length === 0) {
      console.log('❌ Нет активных пользователей для создания заявок');
      return;
    }

    console.log(`👥 Найдено ${users.length} активных пользователей`);

    // Обновляем баланс отпускных дней пользователей
    await User.update(
      { vacationDays: 28 },
      { where: { status: 'active' } }
    );
    console.log('💰 Обновлен баланс отпускных дней (28 дней для всех)');

    const absencesData = [];

    // Создаем разные типы заявок
    const absenceTypes = [
      { type: 'vacation', reason: 'Семейный отпуск' },
      { type: 'sick', reason: 'Простуда' },
      { type: 'business_trip', reason: 'Командировка в Москву' },
      { type: 'day_off', reason: 'Личные дела' },
      { type: 'vacation', reason: 'Отдых на море' },
      { type: 'sick', reason: 'Медицинское обследование' }
    ];

    users.forEach((user, index) => {
      // Для каждого пользователя создаем 2-3 заявки
      const numAbsences = Math.floor(Math.random() * 2) + 2; // 2-3 заявки
      
      for (let i = 0; i < numAbsences; i++) {
        const absenceType = absenceTypes[(index * numAbsences + i) % absenceTypes.length];
        
        // Генерируем даты
        const startDate = moment().add(Math.floor(Math.random() * 60) + 5, 'days'); // от 5 до 65 дней в будущем
        const duration = absenceType.type === 'vacation' ? 
          Math.floor(Math.random() * 10) + 5 : // отпуск 5-14 дней
          Math.floor(Math.random() * 3) + 1;   // другие 1-3 дня
        
        const endDate = startDate.clone().add(duration - 1, 'days');
        
        // Определяем статус (80% pending, 10% approved, 10% rejected)
        const rand = Math.random();
        let status = 'pending';
        let approvedBy = null;
        let approvedAt = null;
        let rejectionReason = null;

        if (rand < 0.1) {
          status = 'approved';
          approvedBy = users[0].id; // первый пользователь как менеджер
          approvedAt = moment().subtract(Math.floor(Math.random() * 5), 'days').toDate();
        } else if (rand < 0.2) {
          status = 'rejected';
          approvedBy = users[0].id;
          approvedAt = moment().subtract(Math.floor(Math.random() * 5), 'days').toDate();
          rejectionReason = 'Нет покрытия на данный период';
        }

        absencesData.push({
          userId: user.id,
          type: absenceType.type,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          reason: absenceType.reason,
          status: status,
          approvedBy: approvedBy,
          approvedAt: approvedAt,
          rejectionReason: rejectionReason,
          daysCount: duration
        });
      }
    });

    // Создаем заявки
    const createdAbsences = await Absence.bulkCreate(absencesData);
    console.log(`📝 Создано ${createdAbsences.length} заявок на отсутствие`);

    // Статистика по типам
    const stats = {};
    createdAbsences.forEach(absence => {
      stats[absence.type] = (stats[absence.type] || 0) + 1;
    });

    console.log('\n📊 Статистика созданных заявок:');
    Object.entries(stats).forEach(([type, count]) => {
      const typeNames = {
        vacation: 'Отпуск',
        sick: 'Больничный',
        business_trip: 'Командировка',
        day_off: 'Отгул'
      };
      console.log(`   ${typeNames[type]}: ${count}`);
    });

    // Статистика по статусам
    const statusStats = {};
    createdAbsences.forEach(absence => {
      statusStats[absence.status] = (statusStats[absence.status] || 0) + 1;
    });

    console.log('\n🔄 Статистика по статусам:');
    Object.entries(statusStats).forEach(([status, count]) => {
      const statusNames = {
        pending: 'Ожидает рассмотрения',
        approved: 'Одобрено',
        rejected: 'Отклонено'
      };
      console.log(`   ${statusNames[status]}: ${count}`);
    });

    // Создаем несколько заявок для ближайших дат (для демонстрации)
    const upcomingAbsences = [];
    for (let i = 0; i < 3; i++) {
      const user = users[i % users.length];
      const startDate = moment().add(i + 1, 'days');
      const endDate = startDate.clone().add(1, 'days');

      upcomingAbsences.push({
        userId: user.id,
        type: 'vacation',
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        reason: `Демо отпуск ${i + 1}`,
        status: 'approved',
        approvedBy: users[0].id,
        approvedAt: new Date(),
        daysCount: 2
      });
    }

    await Absence.bulkCreate(upcomingAbsences);
    console.log(`🗓️ Создано ${upcomingAbsences.length} ближайших отсутствий для демонстрации`);

    console.log('\n✅ Заполнение данными завершено!');
    console.log('\n🔗 Тестовые URL для проверки:');
    console.log('   GET /api/absences - список всех заявок');
    console.log('   GET /api/schedule/month - календарь текущего месяца');
    console.log('   GET /api/schedule/upcoming - ближайшие отсутствия');

  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
  }
}

// Функция инициализации
async function initializeAbsencesSeed() {
  try {
    // Подключение к базе данных
    await sequelize.authenticate();
    console.log('🔗 Подключение к БД установлено');

    // Синхронизация моделей (создание таблиц если их нет)
    await sequelize.sync({ alter: true });
    console.log('🔄 Модели синхронизированы');

    // Запуск наполнения
    await seedAbsences();

  } catch (error) {
    console.error('💥 Ошибка инициализации:', error);
  } finally {
    // Закрытие соединения
    await sequelize.close();
    console.log('🔌 Соединение с БД закрыто');
  }
}

// Запуск скрипта
if (require.main === module) {
  initializeAbsencesSeed();
}

module.exports = { seedAbsences }; 