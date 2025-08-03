import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import ApiResponse from '../utils/apiResponse';

class ShoppingController {
  async createShoppingList(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      const userId = req.user.user_id;
      const { recipe_id, items } = req.body;

      const { data: shoppingList, error } = await supabaseService.createShoppingList({
        user_id: userId,
        recipe_id,
        items,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      return ApiResponse.success(res, { shoppingList });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  async getShoppingLists(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      const userId = req.user.user_id;
      const { data: lists, error } = await supabaseService.getUserShoppingLists(userId);

      if (error) throw error;

      return ApiResponse.success(res, { lists });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  async updateShoppingListItem(req: Request, res: Response) {
    try {
      const { id, itemId } = req.params;
      const { is_purchased } = req.body;

      const { data: updatedItem, error } = await supabaseService.updateShoppingListItem(
        id,
        itemId,
        { is_purchased }
      );

      if (error) throw error;

      return ApiResponse.success(res, { updatedItem });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  async deleteShoppingList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error } = await supabaseService.deleteShoppingList(id);

      if (error) throw error;

      return ApiResponse.success(res, { message: 'Shopping list deleted successfully' });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }
}

export default new ShoppingController();