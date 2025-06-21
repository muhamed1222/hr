/**
 * 🤖 Автоматический эмулятор Telegram WebApp API для разработки
 * Активируется только в development режиме если window.Telegram отсутствует
 */

/**
 * 🔐 Генерация initData с правильной подписью для эмуляции
 * Реализует алгоритм проверки подписи Telegram WebApp
 */

// Функция для создания HMAC-SHA256 подписи (упрощенная версия для dev)
async function createHmacSha256(key, data) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Генерация initData для mock пользователя
async function generateInitData(user) {
  const BOT_TOKEN = 'mock_bot_token_' + Date.now(); // Mock токен для dev
  const auth_date = Math.floor(Date.now() / 1000);
  
  // Данные для подписи (в том же формате что использует Telegram)
  const dataCheckString = [
    `auth_date=${auth_date}`,
    `user=${JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: 'ru',
      is_premium: false,
      allows_write_to_pm: true
    })}`
  ].sort().join('\n');
  
  // Создаем секретный ключ из токена бота (как в Telegram API)
  const secretKey = await createHmacSha256('WebAppData', BOT_TOKEN);
  
  // Создаем подпись данных
  const hash = await createHmacSha256(secretKey, dataCheckString);
  
  // Формируем finitive initData строку
  const initData = [
    `auth_date=${auth_date}`,
    `hash=${hash}`,
    `user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: 'ru',
      is_premium: false,
      allows_write_to_pm: true
    }))}`
  ].join('&');
  
  console.log('🔐 Сгенерированы initData для пользователя:', {
    user_id: user.id,
    username: user.username,
    auth_date,
    hash: hash.substring(0, 8) + '...',
    initData_length: initData.length
  });
  
  return {
    initData,
    initDataUnsafe: {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: 'ru',
        is_premium: false,
        allows_write_to_pm: true
      },
      auth_date,
      hash
    },
    bot_token: BOT_TOKEN // Для логирования в dev режиме
  };
}

// Фиктивные данные пользователей для тестирования
const MOCK_USERS = [
  {
    id: 782245481,
    first_name: 'Мухамед',
    last_name: 'Келеметов', 
    username: 'mukhamed_dev',
    role: 'employee'
  },
  {
    id: 123456789,
    first_name: 'Анна',
    last_name: 'Админова',
    username: 'anna_admin',
    role: 'admin'
  },
  {
    id: 987654321,
    first_name: 'Петр',
    last_name: 'Менеджеров',
    username: 'petr_manager',
    role: 'manager'
  }
];

// Выбираем случайного пользователя или по параметру URL
function getMockUser() {
  const urlParams = new URLSearchParams(window.location.search);
  const mockRole = urlParams.get('mock_role');
  const mockUserId = urlParams.get('mock_user');
  
  if (mockUserId) {
    const userId = parseInt(mockUserId);
    return MOCK_USERS.find(u => u.id === userId) || MOCK_USERS[0];
  }
  
  if (mockRole) {
    return MOCK_USERS.find(u => u.role === mockRole) || MOCK_USERS[0];
  }
  
  // По умолчанию - сотрудник
  return MOCK_USERS[0];
}

// Создаем визуальные элементы для эмуляции кнопок Telegram
function createMockUI() {
  // Удаляем существующие элементы если есть
  const existing = document.getElementById('telegram-mock-ui');
  if (existing) existing.remove();

  const mockUI = document.createElement('div');
  mockUI.id = 'telegram-mock-ui';
  mockUI.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    z-index: 10000;
    border-top: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    backdrop-filter: blur(10px);
  `;

  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    max-width: 600px;
    margin: 0 auto;
  `;

  // Заголовок эмулятора
  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 12px;
    opacity: 0.8;
    font-weight: 500;
  `;
  title.textContent = '🤖 Telegram Mock (DEV)';

  // BackButton
  const backButton = document.createElement('button');
  backButton.id = 'mock-back-button';
  backButton.style.cssText = `
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    display: none;
    transition: all 0.2s ease;
  `;
  backButton.textContent = '← Назад';
  backButton.onclick = () => {
    console.log('🔙 Mock BackButton clicked');
    if (window.Telegram?.WebApp?.BackButton?._clickHandler) {
      window.Telegram.WebApp.BackButton._clickHandler();
    }
  };

  // MainButton
  const mainButton = document.createElement('button');
  mainButton.id = 'mock-main-button';
  mainButton.style.cssText = `
    background: #007AFF;
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: none;
    transition: all 0.2s ease;
    min-width: 120px;
  `;
  mainButton.textContent = 'Действие';
  mainButton.onclick = () => {
    console.log('🔘 Mock MainButton clicked');
    // Тактильный отклик
    document.body.style.transform = 'scale(0.98)';
    setTimeout(() => document.body.style.transform = '', 100);
    
    if (window.Telegram?.WebApp?.MainButton?._clickHandler) {
      window.Telegram.WebApp.MainButton._clickHandler();
    }
  };

  // Переключатель пользователей
  const userSwitcher = document.createElement('select');
  userSwitcher.style.cssText = `
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
  `;
  
  MOCK_USERS.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = `${user.first_name} (${user.role})`;
    option.style.color = 'black';
    userSwitcher.appendChild(option);
  });

  const currentUser = getMockUser();
  userSwitcher.value = currentUser.id;
  
  userSwitcher.onchange = () => {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('mock_user', userSwitcher.value);
    window.location.href = newUrl.toString();
  };

  container.appendChild(title);
  container.appendChild(userSwitcher);
  container.appendChild(backButton);
  container.appendChild(mainButton);
  mockUI.appendChild(container);
  document.body.appendChild(mockUI);

  return { backButton, mainButton };
}

// Создаем полный эмулятор Telegram WebApp API
export async function initTelegramMock() {
  if (window.Telegram) {
    console.log('🔍 Telegram WebApp уже существует, эмуляция не требуется');
    return;
  }

  console.log('🤖 Инициализация Telegram Mock для разработки...');

  const mockUser = getMockUser();
  const { backButton, mainButton } = createMockUI();
  
  // Генерируем правильные initData с подписью
  const initDataResult = await generateInitData(mockUser);
  
  // Выводим детальную информацию для разработчиков
  console.group('🔐 Детали авторизации Telegram Mock');
  console.log('👤 Пользователь:', mockUser);
  console.log('📝 initData длина:', initDataResult.initData.length, 'символов');
  console.log('🔑 Подпись (hash):', initDataResult.initDataUnsafe.hash.substring(0, 16) + '...');
  console.log('⏰ Время авторизации:', new Date(initDataResult.initDataUnsafe.auth_date * 1000).toLocaleString());
  console.log('🤖 Bot Token (mock):', initDataResult.bot_token.substring(0, 20) + '...');
  console.groupEnd();

  // Создаем полный API эмулятор
  window.Telegram = {
    WebApp: {
      // Инициализационные данные с правильной подписью
      initData: initDataResult.initData,
      initDataUnsafe: initDataResult.initDataUnsafe,

      // Информация о среде
      version: '7.0',
      platform: 'web',
      colorScheme: 'light',
      themeParams: {
        bg_color: '#ffffff',
        text_color: '#000000',
        hint_color: '#999999',
        link_color: '#007AFF',
        button_color: '#007AFF',
        button_text_color: '#ffffff'
      },

      // Размеры viewport
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight - 150,
      isExpanded: true,

      // Методы инициализации
      ready() {
        console.log('📱 Mock WebApp ready');
        setTimeout(() => {
          if (this.onEvent) {
            this.onEvent('viewportChanged', {
              isStateStable: true
            });
          }
        }, 100);
      },

      expand() {
        console.log('📏 Mock WebApp expanded');
        this.isExpanded = true;
      },

      close() {
        console.log('❌ Mock WebApp closed');
        window.location.href = 'about:blank';
      },

      // MainButton эмуляция
      MainButton: {
        text: '',
        color: '#007AFF',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        _clickHandler: null,

        setText(text) {
          console.log('🔘 MainButton setText:', text);
          this.text = text;
          mainButton.textContent = text;
          return this;
        },

        show() {
          console.log('👁️ MainButton show');
          this.isVisible = true;
          mainButton.style.display = 'block';
          return this;
        },

        hide() {
          console.log('🙈 MainButton hide');
          this.isVisible = false;
          mainButton.style.display = 'none';
          return this;
        },

        enable() {
          console.log('✅ MainButton enable');
          this.isActive = true;
          mainButton.disabled = false;
          mainButton.style.opacity = '1';
          return this;
        },

        disable() {
          console.log('❌ MainButton disable');
          this.isActive = false;
          mainButton.disabled = true;
          mainButton.style.opacity = '0.5';
          return this;
        },

        showProgress(leaveActive = false) {
          console.log('⏳ MainButton showProgress');
          this.isProgressVisible = true;
          mainButton.textContent = '⏳ ' + this.text;
          if (!leaveActive) this.disable();
          return this;
        },

        hideProgress() {
          console.log('✨ MainButton hideProgress');
          this.isProgressVisible = false;
          mainButton.textContent = this.text;
          this.enable();
          return this;
        },

        setParams(params) {
          console.log('⚙️ MainButton setParams:', params);
          if (params.text) this.setText(params.text);
          if (params.color) {
            this.color = params.color;
            mainButton.style.backgroundColor = params.color;
          }
          if (params.text_color) {
            this.textColor = params.text_color;
            mainButton.style.color = params.text_color;
          }
          if (params.is_active !== undefined) {
            params.is_active ? this.enable() : this.disable();
          }
          if (params.is_visible !== undefined) {
            params.is_visible ? this.show() : this.hide();
          }
          return this;
        },

        onClick(callback) {
          console.log('🎯 MainButton onClick handler set');
          this._clickHandler = callback;
          return this;
        },

        offClick(callback) {
          console.log('🚫 MainButton onClick handler removed');
          this._clickHandler = null;
          return this;
        }
      },

      // BackButton эмуляция
      BackButton: {
        isVisible: false,
        _clickHandler: null,

        show() {
          console.log('👁️ BackButton show');
          this.isVisible = true;
          backButton.style.display = 'block';
          return this;
        },

        hide() {
          console.log('🙈 BackButton hide');
          this.isVisible = false;
          backButton.style.display = 'none';
          return this;
        },

        onClick(callback) {
          console.log('🎯 BackButton onClick handler set');
          this._clickHandler = callback;
          return this;
        },

        offClick(callback) {
          console.log('🚫 BackButton onClick handler removed');
          this._clickHandler = null;
          return this;
        }
      },

      // HapticFeedback эмуляция
      HapticFeedback: {
        impactOccurred(style = 'medium') {
          console.log('📳 HapticFeedback:', style);
          
          // Визуальная имитация тактильного отклика
          const intensity = {
            light: { scale: 0.995, duration: 50 },
            medium: { scale: 0.99, duration: 100 },
            heavy: { scale: 0.985, duration: 150 }
          };

          const effect = intensity[style] || intensity.medium;
          
          document.body.style.transform = `scale(${effect.scale})`;
          document.body.style.transition = 'transform 0.1s ease';
          
          setTimeout(() => {
            document.body.style.transform = '';
            setTimeout(() => {
              document.body.style.transition = '';
            }, 100);
          }, effect.duration);

          return this;
        },

        notificationOccurred(type = 'success') {
          console.log('🔔 Notification HapticFeedback:', type);
          this.impactOccurred(type === 'error' ? 'heavy' : 'light');
          return this;
        },

        selectionChanged() {
          console.log('🎯 Selection HapticFeedback');
          this.impactOccurred('light');
          return this;
        }
      },

      // Диалоги
      showAlert(message, callback) {
        console.log('🚨 Telegram Alert:', message);
        setTimeout(() => {
          alert(message);
          if (callback) callback();
        }, 100);
      },

      showConfirm(message, callback) {
        console.log('❓ Telegram Confirm:', message);
        setTimeout(() => {
          const result = confirm(message);
          if (callback) callback(result);
        }, 100);
      },

      showPopup(params, callback) {
        console.log('💬 Telegram Popup:', params);
        const message = params.message || '';
        const buttons = params.buttons || [{ type: 'ok', text: 'OK' }];
        
        setTimeout(() => {
          const result = confirm(message);
          if (callback) {
            callback(result ? 'ok' : 'cancel');
          }
        }, 100);
      },

      // Настройка цветов
      setHeaderColor(color) {
        if (!this.isVersionAtLeast('6.1')) {
          console.warn('[Telegram.WebApp] Header color is not supported in version', this.version);
          return this;
        }
        console.log('🎨 Header color:', color);
        document.documentElement.style.setProperty('--tg-theme-header-bg-color', color);
        return this;
      },

      setBackgroundColor(color) {
        if (!this.isVersionAtLeast('6.1')) {
          console.warn('[Telegram.WebApp] Background color is not supported in version', this.version);
          return this;
        }
        console.log('🎨 Background color:', color);
        document.documentElement.style.setProperty('--tg-theme-bg-color', color);
        return this;
      },

      // События
      onEvent(eventType, callback) {
        console.log('📡 Event listener added:', eventType);
        // Простая эмуляция событий
        if (eventType === 'viewportChanged') {
          window.addEventListener('resize', () => {
            callback({
              isStateStable: true,
              height: window.innerHeight
            });
          });
        }
      },

      offEvent(eventType, callback) {
        console.log('📡 Event listener removed:', eventType);
      },

      // Утилиты
      isVersionAtLeast(version) {
        const current = this.version.split('.').map(Number);
        const required = version.split('.').map(Number);
        
        for (let i = 0; i < Math.max(current.length, required.length); i++) {
          const c = current[i] || 0;
          const r = required[i] || 0;
          if (c > r) return true;
          if (c < r) return false;
        }
        return true;
      },

      sendData(data) {
        console.log('📤 Mock sendData:', data);
        alert('Mock: Данные отправлены: ' + data);
      }
    }
  };

  // Автоматическая инициализация
  setTimeout(() => {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }, 100);

  console.log('✅ Telegram Mock инициализирован');
  console.log('👤 Текущий пользователь:', mockUser);
  console.log('💡 Подсказка: используйте ?mock_role=admin|manager|employee для смены роли');
} 