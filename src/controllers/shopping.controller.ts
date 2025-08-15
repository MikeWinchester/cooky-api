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
      const { recipe_id, name, description, items }: CreateShoppingListDto & { name?: string } = req.body;

      // Generar IDs únicos para cada item y marcarlos como no comprados
      const processedItems: ShoppingListItem[] = items.map(item => ({
        ...item,
        item_id: uuidv4(),
        is_purchased: false
      }));

      const listName = name || `Lista de Compras - ${new Date().toLocaleDateString()}`;
      const listDescription = description || this.generateAutoDescription(processedItems);

      const { data: shoppingList, error } = await supabaseService.createShoppingList({
        user_id: userId,
        recipe_id,
        name: listName,
        description: listDescription,
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
      const listDescription = `Lista de compras generada para la receta "${recipe.name}". Preparada para ${recipe.servings * servings_multiplier} porciones.`;

      const { data: shoppingList, error } = await supabaseService.createShoppingList({
        user_id: userId,
        recipe_id: recipe_id,
        name: listName,
        description: listDescription,
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

      // Calcular estadísticas y formatear datos para cada lista
      const listsWithDetails = lists?.map(list => {
        const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items || '[]');
        const stats = this.calculateListStats(items);
        
        return {
          ...list,
          stats,
          formatted_created_at: this.formatDate(list.created_at),
          item_count: items.length,
          description: list.description || this.generateAutoDescription(items)
        };
      });

      return ApiResponse.success(res, { lists: listsWithDetails });
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
          stats,
          formatted_created_at: this.formatDate(list.created_at),
          description: list.description || this.generateAutoDescription(items)
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
      const { name, description } = req.body;

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
      const duplicatedDescription = description || `${originalList.description || ''} (Copia creada el ${new Date().toLocaleDateString()})`;

      const { data: duplicatedList, error } = await supabaseService.createShoppingList({
        user_id: userId,
        recipe_id: originalList.recipe_id,
        name: duplicatedName,
        description: duplicatedDescription,
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

  /**
   * Formatea una fecha para mostrar de manera amigable
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Si es hoy
    if (diffDays === 1) {
      return `Hoy a las ${date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    }

    // Si es ayer
    if (diffDays === 2) {
      return `Ayer a las ${date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    }

    // Si es hace menos de una semana
    if (diffDays <= 7) {
      return `Hace ${diffDays - 1} días`;
    }

    // Si es más antigua
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Genera una descripción automática basada en los items
   */
  private generateAutoDescription(items: ShoppingListItem[]): string {
    if (items.length === 0) {
      return 'Lista vacía';
    }

    if (items.length === 1) {
      return `Lista con 1 artículo: ${items[0].name}`;
    }

    if (items.length <= 5) {
      const itemNames = items.slice(0, 3).map(item => item.name).join(', ');
      return `Lista con ${items.length} artículos: ${itemNames}${items.length > 3 ? ' y más...' : ''}`;
    }

    // Categorizar items por tipo (básico)
    const categories = this.categorizeItems(items);
    const categoryDescriptions = Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .slice(0, 3)
      .map(([category, count]) => `${count} ${category}`)
      .join(', ');

    return `Lista con ${items.length} artículos incluyendo ${categoryDescriptions}`;
  }

  /**
   * Categoriza items básicamente por palabras clave
   */
  private categorizeItems(items: ShoppingListItem[]): Record<string, number> {
    const categories = {
      'lácteos': 0,
      'carnes': 0,
      'vegetales': 0,
      'frutas': 0,
      'condimentos': 0,
      'otros': 0
    };

    items.forEach(item => {
      const name = item.name.toLowerCase();
      
      if (name.includes('leche') || name.includes('queso') || name.includes('yogurt') || name.includes('mantequilla')) {
        categories.lácteos++;
      } else if (name.includes('pollo') || name.includes('carne') || name.includes('pescado') || name.includes('jamón')) {
        categories.carnes++;
      } else if (name.includes('tomate') || name.includes('cebolla') || name.includes('ajo') || name.includes('pimiento') || name.includes('lechuga')) {
        categories.vegetales++;
      } else if (name.includes('manzana') || name.includes('plátano') || name.includes('naranja') || name.includes('limón')) {
        categories.frutas++;
      } else if (name.includes('sal') || name.includes('pimienta') || name.includes('aceite') || name.includes('vinagre') || name.includes('especias')) {
        categories.condimentos++;
      } else {
        categories.otros++;
      }
    });

    return categories;
  }
}

export default new ShoppingController();