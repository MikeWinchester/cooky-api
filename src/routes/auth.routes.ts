// src/routes/auth.routes.ts
import { Router } from 'express';
import authController from '../controllers/auth.controller';
import validationMiddleware from '../middlewares/validation.middleware';
import { loginSchema, registerSchema, updateProfileSchema } from '../utils/validator';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.post('/signup', validationMiddleware(registerSchema), authController.register);
router.post('/login', validationMiddleware(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getProfile);
router.put('/me', authMiddleware, validationMiddleware(updateProfileSchema), authController.updateProfile);
router.put('/me/favorites', authMiddleware, authController.updateFavoriteIngredients);
router.put('/me/allergies', authMiddleware, authController.updateAllergies);
router.put('/me/dietary-restrictions', authMiddleware, authController.updateDietaryRestrictions);
router.put('/me/banned-ingredients', authMiddleware, authController.updateBannedIngredients);
router.get('/me/preferences', authMiddleware, authController.getPreferencesSummary);

export default router;
