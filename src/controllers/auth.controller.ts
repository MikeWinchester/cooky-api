import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import ApiResponse from '../utils/apiResponse';
import { RegisterUserDto, LoginUserDto, UserProfile } from '../interfaces/auth.interface';
import authService from '../services/auth.service';

class AuthController {
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
        dietary_restrictions: [],
        banned_ingredients: [],
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
        subscription_status: user[0].subscription_status,
        created_at: user[0].created_at
      };

      return ApiResponse.success(res, { user: userResponse, token });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

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
      return ApiResponse.success(res, { user, token });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

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
}

export default new AuthController();