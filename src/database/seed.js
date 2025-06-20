const { User, WorkLog } = require('../models');
const moment = require('moment');

async function seed() {
  try {
    // // console.log('🌱 Начинаем заполнение базы данных тестовыми данными...');

    // Создаём тестовых пользователей
    const users = [
      {
        telegramId: 123456789,
        name: 'Мухамед Келеметов',
        username: 'muhamed_dev',
        role: 'admin',
        status: 'active'
      },
      {
        telegramId: 987654321,
        name: 'Анна Петрова',
        username: 'anna_designer',
        role: 'manager',
        status: 'active'
      },
      {
        telegramId: 555444333,
        name: 'Сергей Иванов',
        username: 'sergey_backend',
        role: 'employee',
        status: 'active'
      },
      {
        telegramId: 111222333,
        name: 'Мария Сидорова',
        username: 'maria_frontend',
        role: 'employee',
        status: 'active'
      },
      {
        telegramId: 444555666,
        name: 'Алексей Козлов',
        username: 'alex_qa',
        role: 'employee',
        status: 'active'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const [user, created] = await User.findOrCreate({
        where: { telegramId: userData.telegramId },
        defaults: userData
      });
      createdUsers.push(user);
      // // console.log(`✅ Пользователь ${user.name} ${created ? 'создан' : 'уже существует'}`);
    }

    // Создаём тестовые логи рабочего времени за последние 7 дней
    const workLogs = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      
      for (const user of createdUsers) {
        // Пропускаем выходные для некоторых сотрудников
        if (moment(date).day() === 0 || moment(date).day() === 6) {
          if (Math.random() > 0.3) continue; // 30% работают в выходные
        }

        // Генерируем случайные данные о рабочем времени
        const arrivedHour = 8 + Math.floor(Math.random() * 2); // 8-9 утра
        const arrivedMinute = Math.floor(Math.random() * 60);
        const arrivedAt = `${arrivedHour.toString().padStart(2, '0')}:${arrivedMinute.toString().padStart(2, '0')}:00`;

        const leftHour = 17 + Math.floor(Math.random() * 3); // 17-19 вечера
        const leftMinute = Math.floor(Math.random() * 60);
        const leftAt = `${leftHour.toString().padStart(2, '0')}:${leftMinute.toString().padStart(2, '0')}:00`;

        const lunchStart = '13:00:00';
        const lunchEnd = '14:00:00';

        // Случайный режим работы
        const workModes = ['office', 'remote'];
        const workMode = workModes[Math.floor(Math.random() * workModes.length)];

        // Вычисляем общее время работы
        const totalMinutes = calculateWorkMinutes(arrivedAt, leftAt, lunchStart, lunchEnd);

        const workLogData = {
          userId: user.id,
          workDate: date,
          arrivedAt,
          leftAt,
          lunchStart: Math.random() > 0.1 ? lunchStart : null, // 90% берут обед
          lunchEnd: Math.random() > 0.1 ? lunchEnd : null,
          workMode,
          dailyReport: generateRandomReport(),
          problems: Math.random() > 0.8 ? generateRandomProblem() : null, // 20% имеют проблемы
          totalMinutes
        };

        const [workLog, created] = await WorkLog.findOrCreate({
          where: { userId: user.id, workDate: date },
          defaults: workLogData
        });

        if (created) {
          workLogs.push(workLog);
        }
      }
    }

    // // console.log(`✅ Создано ${workLogs.length} записей рабочего времени`);
    // // console.log('🎉 Заполнение базы данных завершено!');
    
    // Выводим статистику
    const userCount = await User.count();
    const logCount = await WorkLog.count();
    
    // // console.log('\n📊 Статистика базы данных:');
    // // console.log(`👥 Пользователей: ${userCount}`);
    // // console.log(`📝 Записей времени: ${logCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка заполнения базы данных:', error);
    process.exit(1);
  }
}

function calculateWorkMinutes(arrivedAt, leftAt, lunchStart, lunchEnd) {
  const arrival = moment(arrivedAt, 'HH:mm:ss');
  const departure = moment(leftAt, 'HH:mm:ss');
  let totalMinutes = departure.diff(arrival, 'minutes');

  // Вычитаем время обеда
  if (lunchStart && lunchEnd) {
    const lunchStartTime = moment(lunchStart, 'HH:mm:ss');
    const lunchEndTime = moment(lunchEnd, 'HH:mm:ss');
    const lunchMinutes = lunchEndTime.diff(lunchStartTime, 'minutes');
    totalMinutes -= lunchMinutes;
  }

  return Math.max(0, totalMinutes);
}

function generateRandomReport() {
  const reports = [
    'Работал над новым функционалом авторизации',
    'Исправлял баги в системе уведомлений',
    'Проводил код-ревью PR коллег',
    'Создавал документацию для API',
    'Участвовал в планировании спринта',
    'Оптимизировал производительность базы данных',
    'Тестировал новые фичи перед релизом',
    'Настраивал CI/CD pipeline',
    'Работал с клиентами по техподдержке',
    'Изучал новые технологии для проекта'
  ];
  
  return reports[Math.floor(Math.random() * reports.length)];
}

function generateRandomProblem() {
  const problems = [
    'Проблемы с интернетом в первой половине дня',
    'Долгое ожидание ответа от клиента',
    'Технические сложности с развёртыванием',
    'Конфликт зависимостей в проекте',
    'Проблемы с доступом к тестовому серверу',
    'Необходимо было ждать код-ревью',
    'Сложности с пониманием требований',
    'Проблемы с производительностью на проде'
  ];
  
  return problems[Math.floor(Math.random() * problems.length)];
}

seed(); 