// API Route для Vercel
export default async function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    res.status(200).json({ 
      message: 'API endpoint работает!', 
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
} 