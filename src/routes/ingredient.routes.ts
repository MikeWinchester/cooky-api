import { Router } from 'express';
import ingredientController from '../controllers/ingredient.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', ingredientController.getAllIngredients);
router.get('/suggestions', ingredientController.getIngredientSuggestions);

export default router;