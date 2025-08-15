export interface GenerateRecipeDto {
  ingredients: string[];
  prompt?: string;
  dietaryRestrictions?: string[];
  bannedIngredients?: string[];
  favoriteIngredients?: string[];
  allergies?: string[];
}

export interface SaveRecipeDto {
  recipe_id?: string;
  name: string;
  description?: string;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  cooking_time: number;
  servings?: number;
  difficulty?: string;
  is_custom?: boolean;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  is_optional?: boolean;
  notes?: string;
}

export interface RecipeStep {
  step: string;
  time: number;
  order: number;
}

// INTERFACES ACTUALIZADAS PARA EL FORMATO REAL DE LA IA
export interface AIRecipeResponse {
  recipes: AIRecipe[];
  total: number;
  generation_time: number;
}

export interface AIRecipe {
  name: string;
  description: string;
  ingredients: AIIngredient[];
  steps: AIRecipeStep[];
  cooking_time: number;
  servings: number;
  dietary_info: string[];
  model_version: string;
  difficulty: string;
}

export interface AIIngredient {
  name: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
}

export interface AIRecipeStep {
  step: string;
  time: number;
  order: number;
}

// Estructura interna normalizada
export interface Recipe {
  recipe_id: string;
  user_id?: string;
  name: string;
  description?: string;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  cooking_time: number;
  servings: number;
  difficulty: string;
  model_version?: string;
  image_url?: string;
  is_cached: boolean;
  cached_until?: string;
  created_at: string;
}

export interface CachedRecipe extends Recipe {
  is_cached: true;
  cached_until: string;
}

export interface SavedRecipe extends Recipe {
  is_cached: false;
  saved_at: string;
}