"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _ExcelJS = require("exceljs");
const _csv = require("csv-parser");
const _fs = require("fs");
const _path = require("path");
const _bcrypt = require("bcrypt");
const { User, Team, Organization, _WorkLog } = require("../models");
const { auditLogger } = require("../utils/auditLogger");

class ImportService {
  static async importUsersFromFile(
    filePath,
    organizationId,
    importedBy,
    options = {},
  ) {
    try {
      const results = {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        users: [],
      };

      // Определяем тип файла
      const fileExtension = path.extname(filePath).toLowerCase();
      const _userData = [];

      if (fileExtension === ".csv") {
        userData = await this.parseCSV(filePath);
      } else if ([".xlsx", ".xls"].includes(fileExtension)) {
        userData = await this.parseExcel(filePath);
      } else {
        throw new Error(
          "Неподдерживаемый формат файла. Используйте CSV или Excel",
        );
      }

      results.total = userData.length;

      // Проверяем лимиты организации
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        throw new Error("Организация не найдена");
      }

      if (organization.maxUsers) {
        const currentUserCount = await User.count({
          where: { organizationId },
        });
        const availableSlots = organization.maxUsers - currentUserCount;

        if (userData.length > availableSlots) {
          throw new Error(
            `Превышен лимит пользователей. Доступно: ${availableSlots}, запрошено: ${userData.length}`,
          );
        }
      }

      // Обрабатываем каждого пользователя
      for (const [index, userRow] of userData.entries()) {
        try {
          const processedUser = await this.processUserRow(
            userRow,
            organizationId,
            options,
          );
          if (processedUser) {
            results.users.push(processedUser);
            results.successful++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: index + 1,
            data: userRow,
            error: error.message,
          });
        }
      }

      // Логируем импорт
      await auditLogger({
        action: "users_import",
        userId: importedBy,
        details: {
          organizationId,
          fileName: path.basename(filePath),
          total: results.total,
          successful: results.successful,
          failed: results.failed,
        },
        adminId: importedBy,
      });

      return results;
    } catch (error) {
      _error("Ошибка импорта пользователей:", error);
      throw error;
    }
  }

  static async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];

      fs.createReadStream(filePath)
        .pipe(
          csv({
            separator: ",",
            headers: true,
            skipEmptyLines: true,
          }),
        )
        .on("data", (data) => {
          results.push(data);
        })
        .on("end", () => {
          resolve(results);
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  static async parseExcel(filePath) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error("Файл не содержит рабочих листов");
      }

      const jsonData = [];
      worksheet.eachRow((row, _rowNumber) => {
        const rowData = [];
        row.eachCell((cell, colNumber) => {
          rowData[colNumber - 1] = cell.value ? String(cell.value).trim() : "";
        });
        jsonData.push(rowData);
      });

      if (jsonData.length < 2) {
        throw new Error(
          "Файл должен содержать заголовки и хотя бы одну строку данных",
        );
      }

      // Первая строка - заголовки
      const headers = jsonData[0].map((header) =>
        String(header).trim().toLowerCase(),
      );

      // Остальные строки - данные
      const dataRows = jsonData.slice(1);

      return dataRows.map((row) => {
        const userObj = {};
        headers.forEach((header, index) => {
          userObj[header] = row[index] ? String(row[index]).trim() : "";
        });
        return userObj;
      });
    } catch (error) {
      throw new Error(`Ошибка парсинга Excel файла: ${error.message}`);
    }
  }

  static async processUserRow(userRow, organizationId, options = {}) {
    // Определяем маппинг полей
    const fieldMapping = {
      // Основные поля
      name: ["name", "имя", "full_name", "fullname", "фио", "full name"],
      username: ["username", "login", "логин", "user_name", "user name"],
      email: ["email", "почта", "e-mail", "mail"],
      phone: ["phone", "телефон", "phone_number", "phone number"],

      // Рабочие поля
      role: ["role", "роль", "position", "должность"],
      team: ["team", "команда", "department", "отдел", "team_name"],
      telegram_id: ["telegram_id", "telegram", "tg_id", "telegram id"],
      telegram_username: [
        "telegram_username",
        "tg_username",
        "telegram user",
        "tg user",
      ],

      // Дополнительные
      salary: ["salary", "зарплата", "wage", "оклад"],
      hire_date: ["hire_date", "дата_найма", "start_date", "дата начала"],
      birth_date: ["birth_date", "дата_рождения", "birthday", "день рождения"],
    };

    // Извлекаем данные из строки
    const userData = {};

    Object.keys(fieldMapping).forEach((field) => {
      const possibleKeys = fieldMapping[field];
      const rowKey = Object.keys(userRow).find((key) =>
        possibleKeys.some((possible) =>
          key.toLowerCase().includes(possible.toLowerCase()),
        ),
      );

      if (rowKey && userRow[rowKey]) {
        userData[field] = userRow[rowKey].trim();
      }
    });

    // Валидация обязательных полей
    if (!userData.name) {
      throw new Error('Поле "Имя" обязательно');
    }

    // Генерируем username если не указан
    if (!userData.username) {
      userData.username = this.generateUsername(userData.name);
    }

    // Проверяем уникальность username
    const existingUser = await User.findOne({
      where: {
        username: userData.username,
        organizationId,
      },
    });

    if (existingUser) {
      userData.username = `${userData.username}_${Date.now()}`;
    }

    // Обрабатываем роль
    userData.role = this.normalizeRole(userData.role);

    // Генерируем временный пароль
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Обрабатываем команду
    const _teamId = null;
    if (userData.team) {
      const team = await this.findOrCreateTeam(userData.team, organizationId);
      teamId = team.id;
    }

    // Создаём пользователя
    const newUser = await User.create({
      name: userData.name,
      username: userData.username,
      email: userData.email || null,
      phone: userData.phone || null,
      role: userData.role,
      passwordHash: hashedPassword,
      telegramId: userData.telegram_id || null,
      telegramUsername: userData.telegram_username || null,
      organizationId,
      isActive: true,
      tempPassword: options.generatePasswords ? tempPassword : null,
    });

    // Добавляем в команду если указана
    if (teamId) {
      const { UserTeam } = require("../models");
      await UserTeam.create({
        userId: newUser.id,
        teamId: teamId,
        role: userData.role === "manager" ? "manager" : "member",
      });
    }

    return {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      team: userData.team,
      tempPassword: options.generatePasswords ? tempPassword : null,
    };
  }

  static generateUsername(name) {
    // Транслитерация русских букв
    const translitMap = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      е: "e",
      ё: "e",
      ж: "zh",
      з: "z",
      и: "i",
      й: "y",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "h",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      щ: "sch",
      ъ: "",
      ы: "y",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya",
    };

    const _username = name.toLowerCase();

    // Транслитерация
    username = username.replace(/[а-яё]/g, (char) => translitMap[char] || char);

    // Убираем лишние символы и заменяем пробелы на подчёркивания
    username = username
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, LIMITS.DEFAULT_PAGE_SIZE);

    return username;
  }

  static normalizeRole(role) {
    if (!role) return "employee";

    const roleLower = role.toLowerCase();

    if (roleLower.includes("admin") || roleLower.includes("администратор")) {
      return "admin";
    }
    if (
      roleLower.includes("manager") ||
      roleLower.includes("менеджер") ||
      roleLower.includes("руководитель")
    ) {
      return "manager";
    }

    return "employee";
  }

  static generateTempPassword(length = 8) {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const _password = "";

    for (let _i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }

  static async findOrCreateTeam(teamName, organizationId) {
    const _team = await Team.findOne({
      where: {
        name: teamName,
        organizationId,
      },
    });

    if (!team) {
      team = await Team.create({
        name: teamName,
        description: `Команда "${teamName}" (создана при импорте)`,
        organizationId,
      });
    }

    return team;
  }

  // Генерация шаблона для импорта
  static async generateImportTemplate(format = "xlsx") {
    const headers = [
      "Имя",
      "Логин",
      "Email",
      "Телефон",
      "Роль",
      "Команда",
      "Telegram ID",
      "Telegram Username",
    ];

    const sampleData = [
      {
        Имя: "Иван Петров",
        Логин: "ivan.petrov",
        Email: "ivan@company.com",
        Телефон: "+7 (999) 123-45-67",
        Роль: "employee",
        Команда: "Разработка",
        "Telegram ID": "123456789",
        "Telegram Username": "ivan_petrov",
      },
      {
        Имя: "Анна Сидорова",
        Логин: "anna.sidorova",
        Email: "anna@company.com",
        Телефон: "+7 (999) 987-65-43",
        Роль: "manager",
        Команда: "Маркетинг",
        "Telegram ID": "987654321",
        "Telegram Username": "anna_sidorova",
      },
    ];

    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...sampleData.map((row) =>
          headers.map((header) => `"${row[header] || ""}"`).join(","),
        ),
      ].join("\n");

      return csvContent;
    } else {
      // Excel format with ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Сотрудники");

      // Добавляем заголовки
      worksheet.addRow(headers);

      // Добавляем данные
      sampleData.forEach((row) => {
        worksheet.addRow(headers.map((header) => row[header] || ""));
      });

      // Автоматическая ширина колонок
      worksheet.columns.forEach((column) => {
        column.width = LIMITS.DEFAULT_PAGE_SIZE;
      });

      return workbook;
    }
  }

  // Валидация файла перед импортом
  static async validateImportFile(filePath) {
    const errors = [];
    const warnings = [];

    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      const _userData = [];

      if (fileExtension === ".csv") {
        userData = await this.parseCSV(filePath);
      } else if ([".xlsx", ".xls"].includes(fileExtension)) {
        userData = await this.parseExcel(filePath);
      } else {
        errors.push("Неподдерживаемый формат файла");
        return { valid: false, errors, warnings };
      }

      if (userData.length === 0) {
        errors.push("Файл не содержит данных");
        return { valid: false, errors, warnings };
      }

      // Проверяем обязательные поля
      const requiredFields = ["name"];
      const firstRow = userData[0];
      const availableFields = Object.keys(firstRow).map((k) => k.toLowerCase());

      requiredFields.forEach((field) => {
        const hasField = availableFields.some(
          (available) =>
            available.includes(field) ||
            available.includes("имя") ||
            available.includes("фио"),
        );

        if (!hasField) {
          errors.push(`Отсутствует обязательное поле: ${field}`);
        }
      });

      // Проверяем на дубликаты
      const usernames = [];
      const emails = [];

      userData.forEach((row, index) => {
        const username = row.username || row.login || row.логин;
        const email = row.email || row.почта;

        if (username && usernames.includes(username)) {
          warnings.push(
            `Строка ${index + 1}: дублирующийся логин "${username}"`,
          );
        } else if (username) {
          usernames.push(username);
        }

        if (email && emails.includes(email)) {
          warnings.push(`Строка ${index + 1}: дублирующийся email "${email}"`);
        } else if (email) {
          emails.push(email);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        preview: userData.slice(0, 5), // Первые 5 строк для предварительного просмотра
        totalRows: userData.length,
      };
    } catch (error) {
      errors.push(`Ошибка чтения файла: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }
}

module.exports = ImportService;
