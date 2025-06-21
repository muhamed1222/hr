import express, { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { CacheManager } from '../services/cache/CacheManager';

const router: Router = express.Router();
const userController = new UserController(new CacheManager({ prefix: 'user:' }));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);

export default router; 