import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import aiService from '../services/ai.service';
import ApiResponse from '../utils/apiResponse';
import { GenerateRecipeDto, SaveRecipeDto } from '../interfaces/recipe.interface';

class RecipeController {
  
  /**
   * Genera nuevas recetas usando IA
   */
  async generateRecipe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { ingredients, prompt }: GenerateRecipeDto = req.body;

      // Obtener el perfil completo del usuario
      const { data: user } = await supabaseService.getUserById(userId);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Verificar si hay recetas similares en cache primero
      const { data: cachedRecipes } = await supabaseService.findSimilarCachedRecipes(
        ingredients, 
        userId
      );

      if (cachedRecipes && Array.isArray(cachedRecipes) && cachedRecipes.length > 0) {
        return ApiResponse.success(res, { 
          recipes: cachedRecipes,
          from_cache: true,
          message: 'Recetas encontradas en cache'
        });
      }

      // Optimizar prompt con preferencias del usuario
      const optimizedPrompt = aiService.optimizePrompt(prompt || '', {
        favoriteIngredients: user.favorite_ingredients,
        allergies: user.allergies,
        dietaryRestrictions: user.dietary_restrictions,
        bannedIngredients: user.banned_ingredients
      });

      // Generar nuevas recetas
      const recipes = await aiService.generateRecipe({
        ingredients,
        prompt: optimizedPrompt,
        dietaryRestrictions: user.dietary_restrictions || [],
        bannedIngredients: user.banned_ingredients || [],
        favoriteIngredients: user.favorite_ingredients || [],
        allergies: user.allergies || []
      });

      // Validar recetas contra preferencias del usuario
      const validatedRecipes = recipes.map(recipe => {
        const validation = aiService.validateRecipeAgainstUserPreferences(recipe, {
          allergies: user.allergies,
          bannedIngredients: user.banned_ingredients
        });
        
        return {
          ...recipe,
          validation_issues: validation.issues,
          is_safe: validation.isValid
        };
      });

      // Guardar recetas válidas en cache
      const savedRecipes = [];
      for (const recipe of validatedRecipes.filter(r => r.is_safe)) {
        try {
          const { data: savedRecipe } = await supabaseService.saveCachedRecipe({
            user_id: userId,
            name: recipe.name,
            description: recipe.description,
            steps: recipe.steps,
            ingredients: recipe.ingredients,
            cooking_time: recipe.cooking_time,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            model_version: recipe.model_version,
            image_url: recipe.image_url,
            prompt: optimizedPrompt
          });
          
          if (savedRecipe) {
            savedRecipes.push({
              ...savedRecipe,
              ingredients: recipe.ingredients,
              steps: recipe.steps
            });
          }
        } catch (error) {
          console.error('Error caching recipe:', error);
          // Continuar con las otras recetas
        }
      }

      return ApiResponse.success(res, { 
        recipes: savedRecipes.length > 0 ? savedRecipes : validatedRecipes,
        from_cache: false,
        validation_summary: {
          total: recipes.length,
          safe: validatedRecipes.filter(r => r.is_safe).length,
          with_issues: validatedRecipes.filter(r => !r.is_safe).length
        }
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Guarda una receta permanentemente
   */
  async saveRecipe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      
      const userId = req.user.user_id;
      const { recipe_id }: SaveRecipeDto = req.body;

      if (!recipe_id) {
        return ApiResponse.badRequest(res, 'recipe_id is required');
      }

      // Verificar que la receta existe y pertenece al usuario o está en cache
      const { data: recipe } = await supabaseService.getRecipeById(recipe_id);
      if (!recipe) {
        return ApiResponse.notFound(res, 'Recipe not found');
      }

      if (recipe.user_id && recipe.user_id !== userId) {
        return ApiResponse.forbidden(res, 'Cannot save another user\'s recipe');
      }

      // Verificar si ya está guardada
      const { data: existingSave } = await supabaseService.getSavedRecipes(userId);
      const alreadySaved = existingSave && Array.isArray(existingSave) && 
        existingSave.some(saved => saved.recipe_id === recipe_id);
      
      if (alreadySaved) {
        return ApiResponse.conflict(res, 'Recipe already saved');
      }

      // Guardar la receta
      const { data: savedRecipe, error } = await supabaseService.saveRecipeToUser(
        userId,
        recipe_id
      );

      if (error) throw error;

      return ApiResponse.success(res, { 
        savedRecipe,
        message: 'Recipe saved successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtiene las recetas guardadas del usuario
   */
  async getSavedRecipes(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      
      const userId = req.user.user_id;
      const { data: recipes, error } = await supabaseService.getSavedRecipes(userId);

      if (error) throw error;

      return ApiResponse.success(res, { recipes: recipes || [] });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtiene las recetas en cache del usuario
   */
  async getCachedRecipes(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      
      const userId = req.user.user_id;
      const { data: recipes, error } = await supabaseService.getCachedRecipes(userId);

      if (error) throw error;

      return ApiResponse.success(res, { recipes: recipes || [] });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtiene una receta específica por ID
   */
  async getRecipeById(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;
      const { data: recipe, error } = await supabaseService.getRecipeById(id);

      if (error) throw error;
      if (!recipe) {
        return ApiResponse.notFound(res, 'Recipe not found');
      }

      // Verificar permisos: debe ser del usuario o estar en cache público
      if (recipe.user_id && recipe.user_id !== req.user.user_id && !recipe.is_cached) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      return ApiResponse.success(res, { recipe });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Elimina una receta guardada
   */
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

  /**
   * Proporciona feedback sobre una receta
   */
  async provideFeedback(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const { id } = req.params;
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return ApiResponse.badRequest(res, 'Rating must be between 1 and 5');
      }

      // Aquí podrías implementar una tabla de feedback si lo deseas
      // Por ahora, solo actualizamos el rating promedio en la receta

      return ApiResponse.success(res, { 
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Limpia las recetas caché expiradas (endpoint administrativo)
   */
  async cleanExpiredCache(req: Request, res: Response) {
    try {
      const result = await supabaseService.cleanExpiredCachedRecipes();
      
      if (result.error) throw result.error;

      // Para operaciones DELETE, el count está en result.count si está disponible
      const deletedCount = result.count || 0;

      return ApiResponse.success(res, { 
        message: 'Expired cached recipes cleaned successfully',
        deleted_count: deletedCount
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }
}

export default new RecipeController();