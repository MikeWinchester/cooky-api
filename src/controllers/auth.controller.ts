import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import ApiResponse from '../utils/apiResponse';
import { RegisterUserDto, LoginUserDto, UserProfile, UpdateUserProfileDto } from '../interfaces/auth.interface';
import authService from '../services/auth.service';

class AuthController {
  
  /**
   * Registro de nuevo usuario
   */
  async register(req: Request, res: Response) {
    try {
      const userData: RegisterUserDto = req.body;
      
      const { data: existingUser } = await supabaseService.getUserByEmail(userData.email);
      if (existingUser) {
        return ApiResponse.conflict(res, 'User already exists');
      }

      const userPayload = {
        email: userData.email,
        password_hash: await authService.hashPassword(userData.password),
        name: userData.name,
        dietary_restrictions: userData.dietary_restrictions || [],
        banned_ingredients: userData.banned_ingredients || [],
        favorite_ingredients: userData.favorite_ingredients || [], // NUEVO
        allergies: userData.allergies || [], // NUEVO
        subscription_status: 'free',
        created_at: new Date().toISOString()
      };

      const { data: user, error } = await supabaseService.createUser(userPayload);

      if (error) throw error;

      const token = authService.generateToken(user[0].user_id);
      
      const userResponse: UserProfile = {
        user_id: user[0].user_id,
        email: user[0].email,
        name: user[0].name,
        dietary_restrictions: user[0].dietary_restrictions,
        banned_ingredients: user[0].banned_ingredients,
        favorite_ingredients: user[0].favorite_ingredients,
        allergies: user[0].allergies,
        subscription_status: user[0].subscription_status,
        created_at: user[0].created_at
      };

      return ApiResponse.success(res, { user: userResponse, token });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Inicio de sesión
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password }: LoginUserDto = req.body;
      
      const { data: user, error } = await supabaseService.getUserByEmail(email);
      if (error || !user) {
        return ApiResponse.unauthorized(res, 'Invalid credentials');
      }

      const isValid = await authService.comparePassword(password, user.password_hash);
      if (!isValid) {
        return ApiResponse.unauthorized(res, 'Invalid credentials');
      }

      const token = authService.generateToken(user.user_id);
      
      // Excluir password_hash de la respuesta
      const { password_hash, ...userResponse } = user;
      
      return ApiResponse.success(res, { user: userResponse, token });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtener perfil del usuario
   */
  async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }
      
      const userId = req.user.user_id;
      const { data: user, error } = await supabaseService.getUserById(userId);
      
      if (error || !user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const { password_hash, ...userData } = user;
      return ApiResponse.success(res, { user: userData });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const updates: UpdateUserProfileDto = req.body;

      // Validar que al menos un campo está siendo actualizado
      const allowedFields = ['name', 'dietary_restrictions', 'banned_ingredients', 'favorite_ingredients', 'allergies'];
      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
      
      if (updateFields.length === 0) {
        return ApiResponse.badRequest(res, 'No valid fields to update');
      }

      // Filtrar solo los campos permitidos
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = updates[key as keyof UpdateUserProfileDto];
          return obj;
        }, {});

      const { data: updatedUser, error } = await supabaseService.updateUserProfile(userId, filteredUpdates);

      if (error) throw error;

      if (!updatedUser || updatedUser.length === 0) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const { password_hash, ...userResponse } = updatedUser[0];

      return ApiResponse.success(res, { 
        user: userResponse,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Actualizar ingredientes favoritos
   */
  async updateFavoriteIngredients(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { favorite_ingredients }: { favorite_ingredients: string[] } = req.body;

      if (!Array.isArray(favorite_ingredients)) {
        return ApiResponse.badRequest(res, 'favorite_ingredients must be an array');
      }

      const { data: updatedUser, error } = await supabaseService.updateUserProfile(userId, {
        favorite_ingredients
      });

      if (error) throw error;

      return ApiResponse.success(res, { 
        favorite_ingredients: updatedUser?.[0]?.favorite_ingredients,
        message: 'Favorite ingredients updated successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Actualizar alergias
   */
  async updateAllergies(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { allergies }: { allergies: string[] } = req.body;

      if (!Array.isArray(allergies)) {
        return ApiResponse.badRequest(res, 'allergies must be an array');
      }

      const { data: updatedUser, error } = await supabaseService.updateUserProfile(userId, {
        allergies
      });

      if (error) throw error;

      return ApiResponse.success(res, { 
        allergies: updatedUser?.[0]?.allergies,
        message: 'Allergies updated successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Actualizar restricciones dietéticas
   */
  async updateDietaryRestrictions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { dietary_restrictions }: { dietary_restrictions: string[] } = req.body;

      if (!Array.isArray(dietary_restrictions)) {
        return ApiResponse.badRequest(res, 'dietary_restrictions must be an array');
      }

      const { data: updatedUser, error } = await supabaseService.updateUserProfile(userId, {
        dietary_restrictions
      });

      if (error) throw error;

      return ApiResponse.success(res, { 
        dietary_restrictions: updatedUser?.[0]?.dietary_restrictions,
        message: 'Dietary restrictions updated successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Actualizar ingredientes prohibidos
   */
  async updateBannedIngredients(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { banned_ingredients }: { banned_ingredients: string[] } = req.body;

      if (!Array.isArray(banned_ingredients)) {
        return ApiResponse.badRequest(res, 'banned_ingredients must be an array');
      }

      const { data: updatedUser, error } = await supabaseService.updateUserProfile(userId, {
        banned_ingredients
      });

      if (error) throw error;

      return ApiResponse.success(res, { 
        banned_ingredients: updatedUser?.[0]?.banned_ingredients,
        message: 'Banned ingredients updated successfully'
      });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Obtener resumen de preferencias del usuario
   */
  async getPreferencesSummary(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const userId = req.user.user_id;
      const { data: user, error } = await supabaseService.getUserById(userId);

      if (error || !user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const preferencesSummary = {
        favorite_ingredients: user.favorite_ingredients || [],
        allergies: user.allergies || [],
        dietary_restrictions: user.dietary_restrictions || [],
        banned_ingredients: user.banned_ingredients || [],
        stats: {
          favorite_count: (user.favorite_ingredients || []).length,
          allergies_count: (user.allergies || []).length,
          dietary_restrictions_count: (user.dietary_restrictions || []).length,
          banned_ingredients_count: (user.banned_ingredients || []).length
        }
      };

      return ApiResponse.success(res, { preferences: preferencesSummary });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }
}

export default new AuthController();