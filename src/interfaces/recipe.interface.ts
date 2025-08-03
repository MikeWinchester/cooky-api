export interface GenerateRecipeDto {
  ingredients: string[];
  prompt?: string;
  dietaryRestrictions?: string[];
  bannedIngredients?: string[];
}

export interface SaveRecipeDto {
  recipe_id?: string; // For AI-generated recipes
  name: string;
  steps: string[];
  ingredients: RecipeIngredient[];
  cooking_time: number;
  servings?: number;
  is_custom?: boolean;
}

export interface RecipeIngredient {
  ingredient_id: string;
  quantity: number;
  unit: string;
  is_optional?: boolean;
  notes?: string;
}

export interface AIRecipeResponse {
  recipe_id: string;
  name: string;
  steps: string[];
  ingredients: RecipeIngredient[];
  cooking_time: number;
  servings: number;
  model_version: string;
  created_at: string;
}
