import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import ApiResponse from '../utils/apiResponse';
import { CreateShoppingListDto, ShoppingListItem, ShoppingListStats } from '../interfaces/shopping.interface';
import { v4 as uuidv4 } from 'uuid';

class ShoppingController {
  
  /**
   * Crea una nueva lista de compras
   */
  async createShoppingList(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      
      const userId = req.user.user_id;
      const { recipe_id, name, items }: CreateShoppingListDto & { name?: string } = req.body;

      // Generar IDs únicos para cada item y marcarlos como no comprados
      const processedItems: ShoppingListItem[] = items.map(item => ({
        ...item,
        item_id: uuidv4(),
        is_purchased: false
      }));

      const listName = name || `Lista de Compras - ${new Date().toLocaleDateString()}`;

      const { data: shoppingList, error } = await supabaseService.createShoppingList({
        user_id: userId,
        recipe_id,
        name: listName,
        items: processedItems
      });

      if (error) throw error;

      return ApiResponse.success(res, { shoppingList });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Crea una lista de compras desde una receta
   */
  async createShoppingListFromRecipe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { recipe_id, servings_multiplier = 1 } = req.body;

      // Obtener la receta
      const { data: recipe } = await supabaseService.getRecipeById(recipe_id);
      if (!recipe) {
        return ApiResponse.notFound(res, 'Recipe not found');
      }

      // Convertir ingredientes de la receta a items de shopping list
      const items: ShoppingListItem[] = recipe.recipe_ingredients.map((ingredient: any) => ({
        item_id: uuidv4(),
        ingredient_id: ingredient.ingredient_id,
        name: ingredient.name,
        quantity: ingredient.quantity * servings_multiplier,
        unit: ingredient.unit,
        is_purchased: false,
        is_optional: ingredient.is_optional || false,
        notes: ingredient.notes
      }));

      const listName = `${recipe.name} - Lista de Compras`;

      const { data: shoppingList, error } = await supabaseService.createShoppingList({
        user_id: userId,
        recipe_id: recipe_id,
        name: listName,
        items
      });

      if (error) throw error;

      return ApiResponse.success(res, { shoppingList });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtiene todas las listas de compras del usuario
   */
  async getShoppingLists(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      
      const userId = req.user.user_id;
      const { data: lists, error } = await supabaseService.getUserShoppingLists(userId);

      if (error) throw error;

      // Calcular estadísticas para cada lista
      const listsWithStats = lists?.map(list => {
        const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items || '[]');
        //const stats = this.calculateListStats(items);
        
        return {
          ...list,
          //stats
        };
      });

      return ApiResponse.success(res, { lists: listsWithStats });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtiene una lista de compras específica
   */
  async getShoppingListById(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;
      const { data: list, error } = await supabaseService.getShoppingListById(id);

      if (error) throw error;
      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      // Verificar que la lista pertenece al usuario
      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      // Procesar items y calcular estadísticas
      const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items || '[]');
      const stats = this.calculateListStats(items);

      return ApiResponse.success(res, { 
        list: {
          ...list,
          items,
          stats
        }
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Actualiza el estado de compra de un item específico
   */
  async updateShoppingListItem(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id, itemId } = req.params;
      const { is_purchased } = req.body;

      if (typeof is_purchased !== 'boolean') {
        return ApiResponse.badRequest(res, 'is_purchased must be a boolean');
      }

      // Verificar que la lista existe y pertenece al usuario
      const { data: list } = await supabaseService.getShoppingListById(id);
      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      const { data: updatedList, error } = await supabaseService.updateShoppingListItem(
        id,
        itemId,
        { is_purchased }
      );

      if (error) throw error;

      return ApiResponse.success(res, { 
        updatedList,
        message: `Item marked as ${is_purchased ? 'purchased' : 'not purchased'}`
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Actualiza múltiples items de una lista
   */
  async updateShoppingListItems(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;
      const { items }: { items: ShoppingListItem[] } = req.body;

      // Verificar que la lista existe y pertenece al usuario
      const { data: list } = await supabaseService.getShoppingListById(id);
      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      const { data: updatedList, error } = await supabaseService.updateShoppingListItems(id, items);

      if (error) throw error;

      return ApiResponse.success(res, { updatedList });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Marca todos los items como comprados/no comprados
   */
  async toggleAllItems(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;
      const { is_purchased } = req.body;

      if (typeof is_purchased !== 'boolean') {
        return ApiResponse.badRequest(res, 'is_purchased must be a boolean');
      }

      // Obtener la lista actual
      const { data: list } = await supabaseService.getShoppingListById(id);
      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      // Actualizar todos los items
      const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items || '[]');
      const updatedItems = items.map((item: ShoppingListItem) => ({
        ...item,
        is_purchased
      }));

      const { data: updatedList, error } = await supabaseService.updateShoppingListItems(id, updatedItems);

      if (error) throw error;

      return ApiResponse.success(res, { 
        updatedList,
        message: `All items marked as ${is_purchased ? 'purchased' : 'not purchased'}`
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Añade un item a una lista existente
   */
  async addItemToList(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;
      const { name, quantity, unit, is_optional = false, notes }: Omit<ShoppingListItem, 'item_id' | 'is_purchased'> = req.body;

      // Obtener la lista actual
      const { data: list } = await supabaseService.getShoppingListById(id);
      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      // Agregar el nuevo item
      const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items || '[]');
      const newItem: ShoppingListItem = {
        item_id: uuidv4(),
        name,
        quantity,
        unit,
        is_purchased: false,
        is_optional,
        notes
      };

      const updatedItems = [...items, newItem];

      const { data: updatedList, error } = await supabaseService.updateShoppingListItems(id, updatedItems);

      if (error) throw error;

      return ApiResponse.success(res, { 
        updatedList,
        newItem,
        message: 'Item added successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Elimina un item de una lista
   */
  async removeItemFromList(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id, itemId } = req.params;

      // Obtener la lista actual
      const { data: list } = await supabaseService.getShoppingListById(id);
      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      // Remover el item
      const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items || '[]');
      const updatedItems = items.filter((item: ShoppingListItem) => item.item_id !== itemId);

      const { data: updatedList, error } = await supabaseService.updateShoppingListItems(id, updatedItems);

      if (error) throw error;

      return ApiResponse.success(res, { 
        updatedList,
        message: 'Item removed successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Elimina una lista de compras completa
   */
  async deleteShoppingList(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;

      // Verificar que la lista existe y pertenece al usuario
      const { data: list } = await supabaseService.getShoppingListById(id);
      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      const { error } = await supabaseService.deleteShoppingList(id);

      if (error) throw error;

      return ApiResponse.success(res, { message: 'Shopping list deleted successfully' });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtiene estadísticas de una lista específica
   */
  async getShoppingListStats(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;
      const { data: list } = await supabaseService.getShoppingListById(id);

      if (!list) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (list.user_id !== req.user.user_id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items || '[]');
      const stats = this.calculateListStats(items);

      return ApiResponse.success(res, { stats });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Duplica una lista de compras
   */
  async duplicateShoppingList(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { id } = req.params;
      const { name } = req.body;

      // Obtener la lista original
      const { data: originalList } = await supabaseService.getShoppingListById(id);
      if (!originalList) {
        return ApiResponse.notFound(res, 'Shopping list not found');
      }

      if (originalList.user_id !== userId) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      // Crear nueva lista con items reseteados
      const originalItems = Array.isArray(originalList.items) ? originalList.items : JSON.parse(originalList.items || '[]');
      const newItems: ShoppingListItem[] = originalItems.map((item: ShoppingListItem) => ({
        ...item,
        item_id: uuidv4(),
        is_purchased: false // Resetear estado de compra
      }));

      const duplicatedName = name || `${originalList.name} - Copia`;

      const { data: duplicatedList, error } = await supabaseService.createShoppingList({
        user_id: userId,
        recipe_id: originalList.recipe_id,
        name: duplicatedName,
        items: newItems
      });

      if (error) throw error;

      return ApiResponse.success(res, { 
        duplicatedList,
        message: 'Shopping list duplicated successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Calcula estadísticas de una lista de compras
   */
  private calculateListStats(items: ShoppingListItem[]): ShoppingListStats {
    const totalItems = items.length;
    const purchasedItems = items.filter(item => item.is_purchased).length;
    const pendingItems = totalItems - purchasedItems;
    const completionPercentage = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;

    return {
      total_items: totalItems,
      purchased_items: purchasedItems,
      pending_items: pendingItems,
      completion_percentage: completionPercentage
    };
  }
}

export default new ShoppingController();