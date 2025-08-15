import { createClient } from '@supabase/supabase-js';
import config from '../config/env';
import { Recipe, RecipeIngredient, RecipeStep } from '../interfaces/recipe.interface';
import { ShoppingList, ShoppingListItem } from '../interfaces/shopping.interface';

class SupabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
  }

  // ===== USER OPERATIONS =====
  async createUser(userData: {
    email: string;
    password_hash: string;
    name: string;
    dietary_restrictions?: string[];
    banned_ingredients?: string[];
    favorite_ingredients?: string[];
    allergies?: string[];
    subscription_status?: string;
    created_at?: string;
  }) {
    return this.supabase.from('users').insert([userData]).select();
  }

  async getUserByEmail(email: string) {
    return this.supabase.from('users').select('*').eq('email', email).single();
  }

  async getUserById(userId: string) {
    return this.supabase.from('users').select('*').eq('user_id', userId).single();
  }

  async updateUserProfile(userId: string, updates: {
    name?: string;
    dietary_restrictions?: string[];
    banned_ingredients?: string[];
    favorite_ingredients?: string[];
    allergies?: string[];
  }) {
    return this.supabase.from('users').update(updates).eq('user_id', userId).select();
  }

  // ===== RECIPE OPERATIONS =====
  async saveCachedRecipe(recipeData: {
    user_id: string;
    name: string;
    description?: string;
    steps: RecipeStep[];
    ingredients: RecipeIngredient[];
    cooking_time: number;
    servings: number;
    difficulty: string;
    model_version?: string;
    image_url?: string;
    prompt?: string;
  }) {
    try {
      // 1. Preparar los datos para ai_recipes (SIN ingredients, solo steps)
      const recipeToInsert = {
        user_id: recipeData.user_id,
        name: recipeData.name,
        description: recipeData.description,
        steps: recipeData.steps, // Los steps van como array en ai_recipes
        cooking_time: recipeData.cooking_time,
        servings: recipeData.servings,
        difficulty: recipeData.difficulty,
        model_version: recipeData.model_version,
        image_url: recipeData.image_url,
        prompt: recipeData.prompt,
        is_cached: true,
        cached_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 horas
        created_at: new Date().toISOString()
      };

      // 2. Insertar la receta principal
      const { data: recipe, error: recipeError } = await this.supabase
        .from('ai_recipes')
        .insert([recipeToInsert])
        .select()
        .single();

      if (recipeError) {
        console.error('Error inserting recipe:', recipeError);
        throw recipeError;
      }

      if (!recipe) {
        throw new Error('Failed to save recipe - no data returned');
      }

      // 3. Insertar los ingredientes en recipe_ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientsToInsert = recipeData.ingredients.map((ing, index) => ({
          recipe_id: recipe.recipe_id,
          ingredient_id: null, // Para recipes cacheadas, podemos no tener ingredient_id
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          is_optional: ing.is_optional || false,
          notes: ing.notes || null,
          display_order: index + 1
        }));

        const { error: ingredientsError } = await this.supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) {
          console.error('Error inserting ingredients:', ingredientsError);
          
          // Rollback: eliminar la receta si falló insertar ingredientes
          await this.supabase
            .from('ai_recipes')
            .delete()
            .eq('recipe_id', recipe.recipe_id);
          
          throw ingredientsError;
        }
      }

      // 4. Retornar la receta con sus ingredientes
      const completeRecipe = {
        ...recipe,
        ingredients: recipeData.ingredients
      };

      return { data: completeRecipe, error: null };

    } catch (error) {
      console.error('Error in saveCachedRecipe:', error);
      return { data: null, error };
    }
  }

  async saveRecipeToUser(userId: string, recipeId: string) {
    // Marcar receta como no-cache (permanente)
    await this.supabase
      .from('ai_recipes')
      .update({ is_cached: false })
      .eq('recipe_id', recipeId);

    // Agregar a saved_recipes
    return this.supabase.from('saved_recipes').insert([{
      user_id: userId,
      recipe_id: recipeId,
      saved_at: new Date().toISOString()
    }]).select();
  }

  async getSavedRecipes(userId: string) {
    return this.supabase
      .from('saved_recipes')
      .select(`
        *,
        ai_recipes (
          *,
          recipe_ingredients (*)
        )
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });
  }

  async getCachedRecipes(userId: string) {
    return this.supabase
      .from('ai_recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('user_id', userId)
      .eq('is_cached', true)
      .gt('cached_until', new Date().toISOString())
      .order('created_at', { ascending: false });
  }

  async getRecipeById(recipeId: string) {
    return this.supabase
      .from('ai_recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('recipe_id', recipeId)
      .single();
  }

  async deleteSavedRecipe(userId: string, recipeId: string) {
    return this.supabase
      .from('saved_recipes')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);
  }

  async cleanExpiredCachedRecipes() {
    return this.supabase
      .from('ai_recipes')
      .delete()
      .eq('is_cached', true)
      .lt('cached_until', new Date().toISOString());
  }

  // ===== SHOPPING LIST OPERATIONS =====
  async createShoppingList(listData: {
    user_id: string;
    recipe_id?: string;
    name: string;
    items: ShoppingListItem[];
  }) {
    return this.supabase.from('shopping_lists').insert([{
      ...listData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]).select();
  }

  async getUserShoppingLists(userId: string) {
    return this.supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
  }

  async getShoppingListById(listId: string) {
    return this.supabase
      .from('shopping_lists')
      .select('*')
      .eq('list_id', listId)
      .single();
  }

  async updateShoppingListItems(listId: string, items: ShoppingListItem[]) {
    return this.supabase
      .from('shopping_lists')
      .update({ 
        items: JSON.stringify(items),
        updated_at: new Date().toISOString()
      })
      .eq('list_id', listId)
      .select();
  }

  async updateShoppingListItem(listId: string, itemId: string, updates: { is_purchased: boolean }) {
    // Obtener la lista actual
    const { data: list } = await this.getShoppingListById(listId);
    if (!list) throw new Error('Shopping list not found');

    // Actualizar el item específico
    const items = Array.isArray(list.items) ? list.items : JSON.parse(list.items);
    const updatedItems = items.map((item: ShoppingListItem) => 
      item.item_id === itemId ? { ...item, ...updates } : item
    );

    return this.updateShoppingListItems(listId, updatedItems);
  }

  async deleteShoppingList(listId: string) {
    return this.supabase
      .from('shopping_lists')
      .delete()
      .eq('list_id', listId);
  }

  // ===== INGREDIENT OPERATIONS =====
  async getAllIngredients() {
    return this.supabase.from('ingredients').select('*').order('name');
  }

  async searchIngredients(query: string) {
    return this.supabase
      .from('ingredients')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);
  }

  async getIngredientById(ingredientId: string) {
    return this.supabase
      .from('ingredients')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .single();
  }

  async createIngredient(ingredientData: {
    name: string;
    canonical_name?: string;
    category?: string;
    is_primary?: boolean;
    image_url?: string;
  }) {
    return this.supabase.from('ingredients').insert([ingredientData]).select();
  }

  // ===== RECIPE IMAGE CACHE OPERATIONS =====
  async getCachedRecipeImage(recipeNameHash: string) {
    return this.supabase
      .from('recipe_images')
      .select('*')
      .eq('recipe_name_hash', recipeNameHash)
      .single();
  }

  async cacheRecipeImage(imageData: {
    recipe_name_hash: string;
    image_url: string;
    source?: string;
    tags?: string[];
  }) {
    return this.supabase
      .from('recipe_images')
      .upsert([{
        ...imageData,
        created_at: new Date().toISOString()
      }])
      .select();
  }

  async deleteOldCachedImages(daysOld: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return this.supabase
      .from('recipe_images')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
  }

  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Genera un UUID v4
   */
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Busca recetas similares en cache basado en ingredientes
   */
  async findSimilarCachedRecipes(ingredients: string[], userId?: string) {
    let query = this.supabase
      .from('ai_recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('is_cached', true)
      .gt('cached_until', new Date().toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    return query.order('created_at', { ascending: false }).limit(5);
  }
}

export default new SupabaseService();