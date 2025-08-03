export interface Ingredient {
  ingredient_id: string;
  name: string;
  canonical_name?: string;
  category?: string;
  is_primary?: boolean;
}

export interface IngredientCategory {
  id: number;
  name: string;
  icon_url?: string;
  color_hex?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface Substitute {
  substitute_id: string;
  original_ingredient_id: string;
  alternative_ingredient_id: string;
  match_score: number;
  notes?: string;
}

export interface IngredientSearchResult {
  ingredient_id: string;
  name: string;
  category?: string;
}