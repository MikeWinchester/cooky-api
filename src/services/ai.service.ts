import axios, { AxiosError } from 'axios';
import config from '../config/env';
import { GenerateRecipeDto } from '../interfaces/recipe.interface';

// Define la interfaz para la respuesta de error de la API
interface AIErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string>;
}

class AIService {
  async generateRecipe(payload: GenerateRecipeDto) {
    try {
      const response = await axios.post(
        `${config.AI_SERVICE_URL}/api/v1/generate-recipe`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.AI_SERVICE_KEY
          }
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<AIErrorResponse>;
        const errorMessage = axiosError.response?.data?.detail || 
                            axiosError.response?.data?.message || 
                            axiosError.message;
        throw new Error(`AI Service Error: ${errorMessage}`);
      } else if (error instanceof Error) {
        throw new Error(`AI Service Error: ${error.message}`);
      } else {
        throw new Error('Unknown error occurred in AI Service');
      }
    }
  }
}

export default new AIService();