import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const authService = new AuthService();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.validateUser(email, password);
  const token = authService.generateToken(user.id);
  
  res.json({
    message: 'Успешная авторизация',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
}));

router.post('/register', async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

export default router; 