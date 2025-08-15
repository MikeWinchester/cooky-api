export interface ShoppingList {
  list_id: string;
  user_id: string;
  recipe_id?: string;
  name: string;
  items: ShoppingListItem[];
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  item_id: string;
  ingredient_id?: string;
  name: string;
  quantity: number;
  unit: string;
  is_purchased: boolean;
  is_optional?: boolean;
  notes?: string;
}

export interface CreateShoppingListDto {
  recipe_id?: string;
  name?: string;
  items: Omit<ShoppingListItem, 'item_id' | 'is_purchased'>[];
}

export interface UpdateShoppingListItemDto {
  is_purchased: boolean;
}

export interface UpdateShoppingListDto {
  name?: string;
  items?: ShoppingListItem[];
}

export interface ShoppingListStats {
  total_items: number;
  purchased_items: number;
  pending_items: number;
  completion_percentage: number;
}