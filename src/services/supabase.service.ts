import { createClient } from '@supabase/supabase-js';
import config from '../config/env';

class SupabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
  }

  // User operations
  async createUser(userData: {
    email: string;
    password_hash: string;
    name: string;
    dietary_restrictions?: string[];
    banned_ingredients?: string[];
    subscription_status?: string;
    created_at?: string;
  }) {
    return this.supabase.from('users').insert([userData]).select();
  }

  async getUserByEmail(email: string) {
    return this.supabase.from('users').select('*').eq('email', email).single();
  }

  // Recipe operations
  async saveRecipe(recipeData: any) {
    return this.supabase.from('ai_recipes').insert([recipeData]).select();
  }

  async getSavedRecipes(userId: string) {
    return this.supabase
      .from('saved_recipes')
      .select('*, ai_recipes(*)')
      .eq('user_id', userId);
  }

  // Shopping list operations
  async createShoppingList(listData: any) {
    return this.supabase.from('shopping_lists').insert([listData]).select();
  }

  async getAllIngredients() {
  return this.supabase.from('ingredients').select('*');
  }

  async searchIngredients(query: string) {
  return this.supabase
    .from('ingredients')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10);
  }

  async getUserById(userId: string) {
  return this.supabase.from('users').select('*').eq('user_id', userId).single();
  }

  async saveRecipeToUser(userId: string, recipeData: any) {
  return this.supabase.from('saved_recipes').insert([{
      user_id: userId,
      recipe_id: recipeData.recipe_id,
      saved_at: new Date().toISOString()
    }]).select();
  }

  async deleteSavedRecipe(userId: string, recipeId: string) {
  return this.supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeId);
  }

  async getUserShoppingLists(userId: string) {
  return this.supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId);
  }

  async updateShoppingListItem(
    listId: string,
    itemId: string,
    updates: { is_purchased: boolean }
  ) {
    return this.supabase
        .from('shopping_lists')
        .update({ items: updates })
        .eq('id', listId)
        .eq('items->>item_id', itemId);
  }

  async deleteShoppingList(listId: string) {
    return this.supabase
      .from('shopping_lists')
      .delete()
      .eq('id', listId);
  }

}

export default new SupabaseService();