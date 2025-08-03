import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import ApiResponse from '../utils/apiResponse';

class IngredientController {
  async getAllIngredients(req: Request, res: Response) {
    try {
      const { data: ingredients, error } = await supabaseService.getAllIngredients();
      
      if (error) throw error;
      
      return ApiResponse.success(res, { ingredients });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  async getIngredientSuggestions(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      if (!query) {
        return ApiResponse.badRequest(res, 'Query parameter "q" is required');
      }

      const { data: suggestions, error } = await supabaseService.searchIngredients(query);
      
      if (error) throw error;
      
      return ApiResponse.success(res, { suggestions });
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }
}

export default new IngredientController();