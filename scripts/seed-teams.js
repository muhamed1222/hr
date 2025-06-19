const { User, Team, UserTeam, sequelize } = require('../src/models');
const AuditLogger = require('../src/utils/auditLogger');

async function seedTeams() {
  try {
    console.log('🌱 Создание тестовых команд...');

    // Найдем существующих пользователей
    const users = await User.findAll();
    if (users.length === 0) {
      console.log('❌ Нет пользователей для создания команд');
      return;
    }

    console.log(`👥 Найдено ${users.length} пользователей`);

    // Найдем админа для создания команд
    const admin = users.find(u => u.role === 'admin');
    if (!admin) {
      console.log('❌ Не найден администратор для создания команд');
      return;
    }

    // Создаем команды
    const teamsData = [
      {
        name: 'Команда разработки',
        description: 'Основная команда разработчиков',
        managerId: admin.id,
        settings: {
          reminders_enabled: true,
          work_hours: {
            start: '09:00',
            end: '18:00',
            lunch_duration: 60
          },
          timezone: 'Europe/Moscow'
        }
      },
      {
        name: 'Команда тестирования',
        description: 'Команда QA инженеров',
        managerId: admin.id,
        settings: {
          reminders_enabled: true,
          work_hours: {
            start: '10:00',
            end: '19:00',
            lunch_duration: 60
          },
          timezone: 'Europe/Moscow'
        }
      },
      {
        name: 'HR отдел',
        description: 'Отдел управления персоналом',
        managerId: admin.id,
        settings: {
          reminders_enabled: false,
          work_hours: {
            start: '09:00',
            end: '17:00',
            lunch_duration: 60
          },
          timezone: 'Europe/Moscow'
        }
      }
    ];

    const createdTeams = [];

    for (const teamData of teamsData) {
      // Проверяем, не существует ли команда уже
      const existingTeam = await Team.findOne({ where: { name: teamData.name } });
      
      if (existingTeam) {
        console.log(`⚠️ Команда "${teamData.name}" уже существует`);
        createdTeams.push(existingTeam);
        continue;
      }

      const team = await Team.create(teamData);
      console.log(`✅ Создана команда: ${team.name}`);
      createdTeams.push(team);

      // Логируем создание команды
      await AuditLogger.logTeamCreated(admin.id, team, { 
        clientIP: '127.0.0.1', 
        userAgent: 'Seed Script' 
      });
    }

    // Добавляем участников в команды
    console.log('\n👥 Добавление участников в команды...');

    // Получаем всех обычных пользователей (не админов)
    const employees = users.filter(u => u.role === 'employee');
    
    if (employees.length === 0) {
      console.log('⚠️ Нет сотрудников для добавления в команды');
    } else {
      // Распределяем сотрудников по командам
      for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        const team = createdTeams[i % createdTeams.length]; // Круговое распределение
        
        // Проверяем, не является ли уже участником
        const existingMembership = await UserTeam.findOne({
          where: { userId: employee.id, teamId: team.id, status: 'active' }
        });
        
        if (existingMembership) {
          console.log(`⚠️ ${employee.name} уже участник команды "${team.name}"`);
          continue;
        }

        await UserTeam.create({
          userId: employee.id,
          teamId: team.id,
          role: 'member',
          status: 'active'
        });

        console.log(`➕ ${employee.name} добавлен в команду "${team.name}"`);

        // Логируем добавление в команду
        await AuditLogger.logTeamMembershipChanged(
          admin.id, 
          team.id, 
          employee.id, 
          'add', 
          { clientIP: '127.0.0.1', userAgent: 'Seed Script' }
        );
      }
    }

    // Выводим итоговую статистику
    console.log('\n📊 Статистика команд:');
    for (const team of createdTeams) {
      const memberCount = await UserTeam.count({
        where: { teamId: team.id, status: 'active' }
      });
      console.log(`  🔹 ${team.name}: ${memberCount} участников`);
    }

    console.log('\n🎉 Создание тестовых команд завершено!');

  } catch (error) {
    console.error('❌ Ошибка создания команд:', error);
    throw error;
  }
}

// Если скрипт запущен напрямую
if (require.main === module) {
  seedTeams()
    .then(() => {
      console.log('✅ Сид завершён');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ошибка:', error);
      process.exit(1);
    });
}

module.exports = { seedTeams }; 