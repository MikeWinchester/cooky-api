import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import aiService from '../services/ai.service';
import ApiResponse from '../utils/apiResponse';
import { GenerateRecipeDto, SaveRecipeDto } from '../interfaces/recipe.interface';

class RecipeController {
  async generateRecipe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { ingredients, prompt }: GenerateRecipeDto = req.body;

      // Obtener el usuario completo
      const { data: user } = await supabaseService.getUserById(userId);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const recipe = await aiService.generateRecipe({
        ingredients,
        prompt,
        dietaryRestrictions: user.dietary_restrictions || [],
        bannedIngredients: user.banned_ingredients || []
      });

      // Optionally save to database
      const { data: savedRecipe } = await supabaseService.saveRecipe({
        ...recipe,
        user_id: userId,
        created_at: new Date().toISOString(),
      });

      return ApiResponse.success(res, { recipe: savedRecipe || recipe });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  async saveRecipe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      const userId = req.user.user_id;
      const recipeData: SaveRecipeDto = req.body;

      const { data: savedRecipe, error } = await supabaseService.saveRecipeToUser(
        userId,
        recipeData
      );

      if (error) throw error;

      return ApiResponse.success(res, { savedRecipe });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  async getSavedRecipes(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      const userId = req.user.user_id;
      const { data: recipes, error } = await supabaseService.getSavedRecipes(userId);

      if (error) throw error;

      return ApiResponse.success(res, { recipes });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  async deleteSavedRecipe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      const userId = req.user.user_id;
      const recipeId = req.params.id;

      const { error } = await supabaseService.deleteSavedRecipe(userId, recipeId);

      if (error) throw error;

      return ApiResponse.success(res, { message: 'Recipe deleted successfully' });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }
}

export default new RecipeController();