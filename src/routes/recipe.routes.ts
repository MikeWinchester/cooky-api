import { Router } from 'express';
import recipeController from '../controllers/recipe.controller';
import authMiddleware from '../middlewares/auth.middleware';
import validationMiddleware from '../middlewares/validation.middleware';
import { generateRecipeSchema } from '../utils/validator';

const router = Router();

router.use(authMiddleware);

router.post('/generate', validationMiddleware(generateRecipeSchema), recipeController.generateRecipe);
router.post('/save', recipeController.saveRecipe);
router.get('/saved', recipeController.getSavedRecipes);
router.delete('/saved/:id', recipeController.deleteSavedRecipe);

export default router;