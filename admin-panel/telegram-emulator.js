// 🎯 Эмулятор Telegram WebApp для тестирования в браузере
// Использование: вставьте этот код в консоль браузера на странице http://localhost:5173

console.log('🚀 Запуск эмулятора Telegram WebApp...');

// Эмуляция Telegram WebApp API
window.Telegram = {
  WebApp: {
    initDataUnsafe: {
      user: {
        id: 782245481,
        first_name: 'Мухамед',
        last_name: 'Келеметов',
        username: 'test_user',
        language_code: 'ru'
      },
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'test_hash'
    },
    
    ready: () => {
      console.log('✅ WebApp ready');
      document.title = '📱 HR System (Telegram WebApp)';
    },
    
    expand: () => {
      console.log('📏 WebApp expanded to full screen');
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    },
    
    close: () => {
      console.log('❌ WebApp closed');
      alert('WebApp would close in real Telegram');
    },
    
    // Главная кнопка
    MainButton: {
      text: '',
      color: '#2481cc',
      textColor: '#ffffff',
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      
      setText: function(text) {
        console.log('🔘 MainButton text:', text);
        this.text = text;
        this._updateButton();
      },
      
      show: function() {
        console.log('👁 MainButton shown');
        this.isVisible = true;
        this._updateButton();
      },
      
      hide: function() {
        console.log('🙈 MainButton hidden');
        this.isVisible = false;
        this._updateButton();
      },
      
      enable: function() {
        console.log('✅ MainButton enabled');
        this.isActive = true;
        this._updateButton();
      },
      
      disable: function() {
        console.log('❌ MainButton disabled');
        this.isActive = false;
        this._updateButton();
      },
      
      showProgress: function() {
        console.log('⏳ MainButton progress shown');
        this.isProgressVisible = true;
        this._updateButton();
      },
      
      hideProgress: function() {
        console.log('✨ MainButton progress hidden');
        this.isProgressVisible = false;
        this._updateButton();
      },
      
      setParams: function(params) {
        console.log('⚙️ MainButton params:', params);
        Object.assign(this, params);
        this._updateButton();
      },
      
      onClick: function(callback) {
        console.log('👆 MainButton click handler set');
        this._clickHandler = callback;
        this._updateButton();
      },
      
      offClick: function(callback) {
        console.log('🚫 MainButton click handler removed');
        this._clickHandler = null;
        this._updateButton();
      },
      
      _updateButton: function() {
        let button = document.getElementById('tg-main-button');
        
        if (!button && this.isVisible) {
          // Создаем кнопку
          button = document.createElement('button');
          button.id = 'tg-main-button';
          button.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            background: ${this.color};
            color: ${this.textColor};
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          `;
          document.body.appendChild(button);
          
          button.addEventListener('click', () => {
            if (this._clickHandler && this.isActive) {
              console.log('🎯 MainButton clicked!');
              this._clickHandler();
            }
          });
        }
        
        if (button) {
          if (this.isVisible) {
            button.textContent = this.isProgressVisible ? '⏳ Загрузка...' : this.text;
            button.style.display = 'block';
            button.style.opacity = this.isActive ? '1' : '0.6';
            button.style.cursor = this.isActive ? 'pointer' : 'not-allowed';
            button.style.background = this.color;
            button.style.color = this.textColor;
          } else {
            button.style.display = 'none';
          }
        }
      }
    },
    
    // Кнопка назад
    BackButton: {
      isVisible: false,
      
      show: function() {
        console.log('⬅️ BackButton shown');
        this.isVisible = true;
        this._updateButton();
      },
      
      hide: function() {
        console.log('➡️ BackButton hidden');
        this.isVisible = false;
        this._updateButton();
      },
      
      onClick: function(callback) {
        console.log('👆 BackButton click handler set');
        this._clickHandler = callback;
        this._updateButton();
      },
      
      offClick: function(callback) {
        console.log('🚫 BackButton click handler removed');
        this._clickHandler = null;
        this._updateButton();
      },
      
      _updateButton: function() {
        let button = document.getElementById('tg-back-button');
        
        if (!button && this.isVisible) {
          // Создаем кнопку
          button = document.createElement('button');
          button.id = 'tg-back-button';
          button.innerHTML = '⬅️ Назад';
          button.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10000;
            background: rgba(0,0,0,0.1);
            color: var(--tg-theme-text-color, #000);
            border: 1px solid rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          `;
          document.body.appendChild(button);
          
          button.addEventListener('click', () => {
            if (this._clickHandler) {
              console.log('🔙 BackButton clicked!');
              this._clickHandler();
            }
          });
          
          // Эмуляция через Escape
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._clickHandler && this.isVisible) {
              console.log('⌨️ BackButton activated via Escape');
              this._clickHandler();
            }
          });
        }
        
        if (button) {
          button.style.display = this.isVisible ? 'block' : 'none';
        }
      }
    },
    
    // Тактильные отклики
    HapticFeedback: {
      impactOccurred: function(style) {
        console.log(`📳 Haptic feedback: ${style}`);
        
        // Визуальная индикация
        const intensity = style === 'heavy' ? 0.7 : style === 'medium' ? 0.85 : 0.95;
        document.body.style.filter = `brightness(${intensity})`;
        
        setTimeout(() => {
          document.body.style.filter = '';
        }, style === 'heavy' ? 150 : style === 'medium' ? 100 : 50);
        
        // Вибрация на поддерживаемых устройствах
        if (navigator.vibrate) {
          const duration = style === 'heavy' ? 100 : style === 'medium' ? 50 : 25;
          navigator.vibrate(duration);
        }
      },
      
      notificationOccurred: function(type) {
        console.log(`🔔 Notification haptic: ${type}`);
        this.impactOccurred('light');
      },
      
      selectionChanged: function() {
        console.log('🎛 Selection haptic');
        this.impactOccurred('light');
      }
    },
    
    // Диалоги
    showAlert: function(message, callback) {
      console.log('🚨 Telegram Alert:', message);
      setTimeout(() => {
        alert(`📱 Telegram Alert\n\n${message}`);
        if (callback) callback();
      }, 100);
    },
    
    showConfirm: function(message, callback) {
      console.log('❓ Telegram Confirm:', message);
      setTimeout(() => {
        const result = confirm(`📱 Telegram Confirm\n\n${message}`);
        if (callback) callback(result);
      }, 100);
    },
    
    showPopup: function(params, callback) {
      console.log('🎭 Telegram Popup:', params);
      const message = params.message || '';
      const buttons = params.buttons || [{ text: 'OK', type: 'default' }];
      
      const buttonTexts = buttons.map(b => b.text).join(' / ');
      const result = prompt(`📱 Telegram Popup\n\n${message}\n\nButtons: ${buttonTexts}`);
      
      if (callback) {
        const buttonId = buttons[0]?.id || 'ok';
        callback(buttonId);
      }
    },
    
    // Настройки цветов
    setHeaderColor: function(color) {
      console.log('🎨 Header color:', color);
      document.documentElement.style.setProperty('--tg-theme-header-bg-color', color);
    },
    
    setBackgroundColor: function(color) {
      console.log('🎨 Background color:', color);
      document.documentElement.style.setProperty('--tg-theme-bg-color', color);
      document.body.style.backgroundColor = color;
    },
    
    // Метаданные
    platform: 'web',
    version: '6.9',
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    themeParams: {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#007aff',
      button_color: '#007aff',
      button_text_color: '#ffffff'
    },
    
    // Данные устройства
    initData: '',
    initDataUnsafe: {
      user: {
        id: 782245481,
        first_name: 'Мухамед',
        last_name: 'Келеметов',
        username: 'test_user',
        language_code: 'ru'
      }
    },
    
    // Методы расширения
    sendData: function(data) {
      console.log('📤 Data sent to bot:', data);
      alert(`Data sent to bot: ${data}`);
    },
    
    ready: function() {
      console.log('✅ WebApp ready');
    },
    
    expand: function() {
      console.log('📏 WebApp expanded');
    }
  }
};

// Автоматическая инициализация
console.log('🎯 Эмулятор установлен! Перезагружаем страницу...');

// Добавление индикатора эмуляции
const indicator = document.createElement('div');
indicator.innerHTML = '🎭 Telegram WebApp Emulator';
indicator.style.cssText = `
  position: fixed;
  top: 0;
  right: 0;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  z-index: 9999;
  border-bottom-left-radius: 4px;
`;
document.body.appendChild(indicator);

// Эмуляция готовности WebApp
setTimeout(() => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    console.log('🎉 Telegram WebApp эмулятор готов к использованию!');
  }
}, 100);

// Перезагрузка для применения изменений
location.reload(); 