import { Router } from 'express';
import shoppingController from '../controllers/shopping.controller';
import authMiddleware from '../middlewares/auth.middleware';
import validationMiddleware from '../middlewares/validation.middleware';
import { shoppingListSchema, createFromRecipeSchema } from '../utils/validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validationMiddleware(shoppingListSchema), shoppingController.createShoppingList);
router.post('/from-recipe', validationMiddleware(createFromRecipeSchema), shoppingController.createShoppingListFromRecipe);
router.get('/', shoppingController.getShoppingLists);
router.get('/:id', shoppingController.getShoppingListById);
router.get('/:id/stats', shoppingController.getShoppingListStats);
router.put('/:id/item/:itemId', shoppingController.updateShoppingListItem);
router.put('/:id/items', shoppingController.updateShoppingListItems);
router.put('/:id/toggle-all', shoppingController.toggleAllItems);
router.post('/:id/items', shoppingController.addItemToList);
router.delete('/:id/item/:itemId', shoppingController.removeItemFromList);
router.post('/:id/duplicate', shoppingController.duplicateShoppingList);
router.delete('/:id', shoppingController.deleteShoppingList);

export default router;