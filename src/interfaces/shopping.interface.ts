export interface ShoppingList {
  list_id: string;
  user_id: string;
  recipe_id?: string;
  items: ShoppingListItem[];
  created_at: string;
}

export interface ShoppingListItem {
  item_id: string;
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  is_purchased: boolean;
  is_optional?: boolean;
}

export interface CreateShoppingListDto {
  recipe_id?: string;
  items: Omit<ShoppingListItem, 'item_id' | 'is_purchased'>[];
}

export interface UpdateShoppingListItemDto {
  is_purchased: boolean;
}