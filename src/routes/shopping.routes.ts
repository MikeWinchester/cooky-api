import { Router } from 'express';
import shoppingController from '../controllers/shopping.controller';
import authMiddleware from '../middlewares/auth.middleware';
import validationMiddleware from '../middlewares/validation.middleware';
import { shoppingListSchema } from '../utils/validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validationMiddleware(shoppingListSchema), shoppingController.createShoppingList);
router.get('/', shoppingController.getShoppingLists);
router.put('/:id/item/:itemId', shoppingController.updateShoppingListItem);
router.delete('/:id', shoppingController.deleteShoppingList);

export default router;