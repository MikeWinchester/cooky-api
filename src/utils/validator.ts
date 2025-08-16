import Joi from 'joi';

export const validate = (data: any, schema: Joi.Schema) => {
  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

// Schemas de autenticación
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().required(),
  dietary_restrictions: Joi.array().items(Joi.string()).optional(),
  banned_ingredients: Joi.array().items(Joi.string()).optional(),
  favorite_ingredients: Joi.array().items(Joi.string()).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().optional(),
  dietary_restrictions: Joi.array().items(Joi.string()).optional(),
  banned_ingredients: Joi.array().items(Joi.string()).optional(),
  favorite_ingredients: Joi.array().items(Joi.string()).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
}).min(1);

// Schemas de recetas
export const generateRecipeSchema = Joi.object({
  ingredients: Joi.array().items(Joi.string()).min(1).required(),
  prompt: Joi.string().optional(),
});

export const saveRecipeSchema = Joi.object({
  recipe_id: Joi.string().required(),
});

// Schemas de shopping lists
export const shoppingListSchema = Joi.object({
  recipe_id: Joi.string().optional(),
  name: Joi.string().optional(),
  description: Joi.string().optional(), // ← AGREGADA
  items: Joi.array().items(
    Joi.object({
      ingredient_id: Joi.string().optional(),
      name: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unit: Joi.string().required(),
      is_optional: Joi.boolean().optional(),
      notes: Joi.string().optional(),
    })
  ).optional(), // ← CAMBIADO DE required() A optional()
});

export const createFromRecipeSchema = Joi.object({
  recipe_id: Joi.string().required(),
  servings_multiplier: Joi.number().positive().optional().default(1),
});

export const updateShoppingItemSchema = Joi.object({
  is_purchased: Joi.boolean().required(),
});

export const addShoppingItemSchema = Joi.object({
  ingredient_id: Joi.string().optional(),
  name: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().required(),
  is_optional: Joi.boolean().optional().default(false),
  notes: Joi.string().optional(),
});

export const duplicateListSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(), // ← AGREGADA para duplicar listas
});

// Schema para actualizar lista completa
export const updateShoppingListSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  items: Joi.array().items(
    Joi.object({
      item_id: Joi.string().required(),
      ingredient_id: Joi.string().optional(),
      name: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unit: Joi.string().required(),
      is_purchased: Joi.boolean().required(),
      is_optional: Joi.boolean().optional(),
      notes: Joi.string().optional(),
    })
  ).optional(),
}).min(1); // Al menos una propiedad debe ser actualizada

// Schema para toggle all items
export const toggleAllItemsSchema = Joi.object({
  is_purchased: Joi.boolean().required(),
});

// Schema para feedback de recetas
export const feedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().optional(),
});