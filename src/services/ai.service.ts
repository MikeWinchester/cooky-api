import axios, { AxiosError } from 'axios';
import config from '../config/env';
import { GenerateRecipeDto, AIRecipeResponse, Recipe, RecipeStep, RecipeIngredient } from '../interfaces/recipe.interface';
import imageService from './unsplash.service';

interface AIErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string>;
}

class AIService {
  
  /**
   * Genera recetas usando el microservicio de IA
   */
  async generateRecipe(payload: GenerateRecipeDto): Promise<Recipe[]> {
    try {
      const response = await axios.post(
        `${config.AI_SERVICE_URL}/api/v1/generate-multiple-recipes`,
        {
          ingredients: payload.ingredients,
          prompt: payload.prompt,
          dietary_restrictions: payload.dietaryRestrictions || [],
          banned_ingredients: payload.bannedIngredients || [],
          favorite_ingredients: payload.favoriteIngredients || [],
          allergies: payload.allergies || []
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.AI_SERVICE_KEY
          }
        }
      );

      console.log('AI Service Response:', response.data);
      
      // ADAPTADO AL FORMATO REAL: La respuesta viene directamente como AIRecipeResponse
      const aiResponse: AIRecipeResponse = response.data;
      
      if (!aiResponse.recipes || !Array.isArray(aiResponse.recipes)) {
        throw new Error('Invalid response from AI service: recipes array not found');
      }

      // Normalizar las recetas del formato AI al formato interno
      const recipes = await this.normalizeAIRecipes(aiResponse.recipes);
      
      return recipes;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<AIErrorResponse>;
        const errorMessage = axiosError.response?.data?.detail || 
                            axiosError.response?.data?.message || 
                            axiosError.message;
        throw new Error(`AI Service Error: ${errorMessage}`);
      } else if (error instanceof Error) {
        throw new Error(`AI Service Error: ${error.message}`);
      } else {
        throw new Error('Unknown error occurred in AI Service');
      }
    }
  }

  /**
   * Normaliza las recetas del formato AI al formato interno
   */
  private async normalizeAIRecipes(aiRecipes: any[]): Promise<Recipe[]> {
    const recipes: Recipe[] = [];
    
    // Obtener imágenes para todas las recetas en paralelo
    const recipeNames = aiRecipes.map(recipe => recipe.name);
    const imageUrls = await imageService.getRecipeImages(recipeNames);

    for (const aiRecipe of aiRecipes) {
      const recipe: Recipe = {
        recipe_id: this.generateTempId(), // ID temporal hasta que se guarde en DB
        name: aiRecipe.name,
        description: aiRecipe.description,
        steps: this.normalizeSteps(aiRecipe.steps),
        ingredients: this.normalizeIngredients(aiRecipe.ingredients),
        cooking_time: aiRecipe.cooking_time,
        servings: aiRecipe.servings,
        difficulty: aiRecipe.difficulty,
        model_version: aiRecipe.model_version,
        image_url: imageUrls[aiRecipe.name],
        is_cached: true,
        cached_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 horas
        created_at: new Date().toISOString()
      };

      recipes.push(recipe);
    }

    return recipes;
  }

  /**
   * Normaliza los pasos de la receta
   */
  private normalizeSteps(aiSteps: any[]): RecipeStep[] {
    return aiSteps
      .sort((a, b) => a.order - b.order)
      .map(step => ({
        step: step.step,
        time: step.time,
        order: step.order
      }));
  }

  /**
   * Normaliza los ingredientes de la receta
   */
  private normalizeIngredients(aiIngredients: any[]): RecipeIngredient[] {
    return aiIngredients.map(ingredient => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      is_optional: ingredient.is_optional || false
    }));
  }

  /**
   * Genera un ID temporal para las recetas
   */
  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Optimiza el prompt basado en las preferencias del usuario
   */
  optimizePrompt(originalPrompt: string, userPreferences: {
    favoriteIngredients?: string[];
    allergies?: string[];
    dietaryRestrictions?: string[];
    bannedIngredients?: string[];
  }): string {
    let optimizedPrompt = originalPrompt;

    // Agregar ingredientes favoritos si están disponibles
    if (userPreferences.favoriteIngredients && userPreferences.favoriteIngredients.length > 0) {
      optimizedPrompt += ` Prioriza el uso de estos ingredientes favoritos: ${userPreferences.favoriteIngredients.join(', ')}.`;
    }

    // Agregar restricciones de alergias
    if (userPreferences.allergies && userPreferences.allergies.length > 0) {
      optimizedPrompt += ` IMPORTANTE: La persona es alérgica a: ${userPreferences.allergies.join(', ')}. NO incluyas estos ingredientes bajo ninguna circunstancia.`;
    }

    // Agregar restricciones dietéticas
    if (userPreferences.dietaryRestrictions && userPreferences.dietaryRestrictions.length > 0) {
      optimizedPrompt += ` La receta debe cumplir con estas restricciones dietéticas: ${userPreferences.dietaryRestrictions.join(', ')}.`;
    }

    // Agregar ingredientes prohibidos
    if (userPreferences.bannedIngredients && userPreferences.bannedIngredients.length > 0) {
      optimizedPrompt += ` Evita usar estos ingredientes: ${userPreferences.bannedIngredients.join(', ')}.`;
    }

    return optimizedPrompt.trim();
  }

  /**
   * Verifica si una receta cumple con las restricciones del usuario
   */
  validateRecipeAgainstUserPreferences(recipe: Recipe, userPreferences: {
    allergies?: string[];
    bannedIngredients?: string[];
  }): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const allIngredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase());

    // Verificar alergias
    if (userPreferences.allergies) {
      for (const allergy of userPreferences.allergies) {
        if (allIngredientNames.some(name => name.includes(allergy.toLowerCase()))) {
          issues.push(`Contiene alérgeno: ${allergy}`);
        }
      }
    }

    // Verificar ingredientes prohibidos
    if (userPreferences.bannedIngredients) {
      for (const banned of userPreferences.bannedIngredients) {
        if (allIngredientNames.some(name => name.includes(banned.toLowerCase()))) {
          issues.push(`Contiene ingrediente prohibido: ${banned}`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export default new AIService();