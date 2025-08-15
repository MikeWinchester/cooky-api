// src/routes/recipe.routes.ts
import { Router } from 'express';
import recipeController from '../controllers/recipe.controller';
import authMiddleware from '../middlewares/auth.middleware';
import validationMiddleware from '../middlewares/validation.middleware';
import { generateRecipeSchema, saveRecipeSchema } from '../utils/validator';

const router = Router();

router.use(authMiddleware);

router.post('/generate', validationMiddleware(generateRecipeSchema), recipeController.generateRecipe);
router.post('/save', validationMiddleware(saveRecipeSchema), recipeController.saveRecipe);
router.get('/saved', recipeController.getSavedRecipes);
router.get('/cached', recipeController.getCachedRecipes);
router.get('/:id', recipeController.getRecipeById);
router.delete('/saved/:id', recipeController.deleteSavedRecipe);
router.post('/:id/feedback', recipeController.provideFeedback);

// Ruta administrativa para limpiar cache
router.delete('/cache/expired', recipeController.cleanExpiredCache);

export default router;