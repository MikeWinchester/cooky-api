import Joi from 'joi';

export const validate = (data: any, schema: Joi.Schema) => {
  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

// Schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const generateRecipeSchema = Joi.object({
  ingredients: Joi.array().items(Joi.string()).min(1).required(),
  prompt: Joi.string().optional(),
});

export const shoppingListSchema = Joi.object({
  recipe_id: Joi.string().optional(),
  items: Joi.array().items(
    Joi.object({
      ingredient_id: Joi.string().required(),
      name: Joi.string().required(),
      quantity: Joi.number().required(),
      unit: Joi.string().required(),
      is_optional: Joi.boolean().optional(),
    })
  ).min(1).required(),
});