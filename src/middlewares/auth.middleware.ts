import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import ApiResponse from '../utils/apiResponse';
import supabaseService from '../services/supabase.service';
import { AuthUser } from '../interfaces/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return ApiResponse.unauthorized(res, 'No token provided');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
    
    const { data: user, error } = await supabaseService.getUserById(decoded.user_id);
    
    if (error || !user) {
      return ApiResponse.unauthorized(res, 'Invalid token');
    }

    req.user = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      subscription_status: user.subscription_status
    };

    next();
  } catch (error) {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }
};

export default authMiddleware;