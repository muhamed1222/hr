"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserController_1 = require("../controllers/UserController");
const CacheManager_1 = require("../services/cache/CacheManager");
const router = express_1.default.Router();
const userController = new UserController_1.UserController(new CacheManager_1.CacheManager({ prefix: 'user:' }));
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
exports.default = router;
