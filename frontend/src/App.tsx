import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [healthData, setHealthData] = useState<any>(null)
  const [currentSection, setCurrentSection] = useState<'main' | 'employees' | 'reports' | 'settings'>('main')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        console.log('Checking health...');
        const response = await fetch('/health');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Health check failed:', response.status, errorText);
          throw new Error(`HTTP error! status: ${response.status}\nResponse: ${errorText}`);
        }

        const data = await response.json();
        console.log('Health check response:', data);
        setHealthData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Health check error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    checkHealth();
  }, []);

  const handleNavigation = (section: 'employees' | 'reports' | 'settings') => {
    setCurrentSection(section);
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'employees':
        return (
          <div className="section-content">
            <h2>Сотрудники</h2>
            <p>Здесь будет список сотрудников</p>
            <button className="back-button" onClick={() => setCurrentSection('main')}>
              Назад
            </button>
          </div>
        );
      case 'reports':
        return (
          <div className="section-content">
            <h2>Отчеты</h2>
            <p>Здесь будут отчеты</p>
            <button className="back-button" onClick={() => setCurrentSection('main')}>
              Назад
            </button>
          </div>
        );
      case 'settings':
        return (
          <div className="section-content">
            <h2>Настройки</h2>
            <p>Здесь будут настройки системы</p>
            <button className="back-button" onClick={() => setCurrentSection('main')}>
              Назад
            </button>
          </div>
        );
      default:
        return (
          <div className="welcome-section">
            <h2>Добро пожаловать в HR систему</h2>
            <p>Статус системы: {healthData?.status}</p>
            
            <div className="action-buttons">
              <button 
                className="action-button"
                onClick={() => handleNavigation('employees')}
              >
                Сотрудники
              </button>
              <button 
                className="action-button"
                onClick={() => handleNavigation('reports')}
              >
                Отчеты
              </button>
              <button 
                className="action-button"
                onClick={() => handleNavigation('settings')}
              >
                Настройки
              </button>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return <div className="app-container">Загрузка...</div>
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error-message">
          <h2>Ошибка подключения к серверу</h2>
          <pre>{error}</pre>
          <button onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>HR Система</h1>
      </header>
      
      <main className="app-main">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
