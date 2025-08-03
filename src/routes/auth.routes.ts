import { Router } from 'express';
import authController from '../controllers/auth.controller';
import validationMiddleware from '../middlewares/validation.middleware';
import { loginSchema, registerSchema } from '../utils/validator';
import authMiddleware from '../middlewares/auth.middleware';


const router = Router();

router.post('/signup', validationMiddleware(registerSchema), authController.register);
router.post('/login', validationMiddleware(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getProfile);

export default router;