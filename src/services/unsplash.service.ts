import crypto from 'crypto';
import supabaseService from './supabase.service';
import config from '../config/env';

interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  alt_description?: string;
}

class ImageService {
  private readonly UNSPLASH_ACCESS_KEY = config.UNSPLASH_ACCESS_KEY;
  private readonly UNSPLASH_BASE_URL = 'https://api.unsplash.com';

  /**
   * Genera un hash único basado en el nombre de la receta para buscar imágenes similares
   */
  private generateRecipeHash(recipeName: string): string {
    return crypto.createHash('md5').update(recipeName.toLowerCase().trim()).digest('hex');
  }

  /**
   * Extrae palabras clave del nombre de la receta para mejorar la búsqueda
   */
  private extractSearchKeywords(recipeName: string): string {
    // Remover palabras comunes y extraer ingredientes/términos culinarios principales
    const commonWords = ['con', 'de', 'la', 'el', 'y', 'a', 'en', 'supremo', 'especial', 'casero'];
    const words = recipeName.toLowerCase()
      .split(/[\s\-_]+/)
      .filter(word => word.length > 2 && !commonWords.includes(word));
    
    // Priorizar primeras 2-3 palabras más relevantes
    return words.slice(0, 3).join(' ') + ' food recipe';
  }

  /**
   * Busca una imagen existente en cache por nombre de receta
   */
  private async getCachedImage(recipeName: string): Promise<string | null> {
    try {
      const recipeHash = this.generateRecipeHash(recipeName);
      const { data: cachedImage } = await supabaseService.getCachedRecipeImage(recipeHash);
      return cachedImage?.image_url || null;
    } catch (error) {
      console.log('No cached image found:', error);
      return null;
    }
  }

  /**
   * Busca imágenes en Unsplash
   */
  private async searchUnsplashImages(query: string): Promise<UnsplashImage | null> {
    if (!this.UNSPLASH_ACCESS_KEY) {
      throw new Error('Unsplash API key not configured');
    }

    try {
      const response = await fetch(
        `${this.UNSPLASH_BASE_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${this.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Seleccionar aleatoriamente una de las primeras 3 imágenes
        const randomIndex = Math.floor(Math.random() * Math.min(3, data.results.length));
        return data.results[randomIndex];
      }
      
      return null;
    } catch (error) {
      console.error('Error searching Unsplash:', error);
      return null;
    }
  }

  /**
   * Obtiene imágenes por defecto como fallback
   */
  private getDefaultFoodImages(): string[] {
    return [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop', // Pizza
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop', // Pancakes
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop', // Sandwich
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop', // Burger
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop', // Salad
    ];
  }

  /**
   * Cachea una imagen de receta en la base de datos
   */
  private async cacheRecipeImage(recipeName: string, imageUrl: string, source: string = 'unsplash'): Promise<void> {
    try {
      const recipeHash = this.generateRecipeHash(recipeName);
      const keywords = this.extractSearchKeywords(recipeName).split(' ');
      
      await supabaseService.cacheRecipeImage({
        recipe_name_hash: recipeHash,
        image_url: imageUrl,
        source,
        tags: keywords,
      });
    } catch (error) {
      console.error('Error caching recipe image:', error);
      // No lanzar error, solo loggear
    }
  }

  /**
   * Obtiene una imagen para una receta (principal método público)
   */
  public async getRecipeImage(recipeName: string): Promise<string> {
    try {
      // 1. Buscar en cache primero
      const cachedImage = await this.getCachedImage(recipeName);
      if (cachedImage) {
        return cachedImage;
      }

      // 2. Buscar en Unsplash
      const keywords = this.extractSearchKeywords(recipeName);
      const unsplashImage = await this.searchUnsplashImages(keywords);
      
      if (unsplashImage) {
        const imageUrl = unsplashImage.urls.regular;
        // Cachear para uso futuro
        await this.cacheRecipeImage(recipeName, imageUrl, 'unsplash');
        return imageUrl;
      }

      // 3. Fallback a imagen por defecto
      const defaultImages = this.getDefaultFoodImages();
      const randomDefault = defaultImages[Math.floor(Math.random() * defaultImages.length)];
      
      // Cachear la imagen por defecto también
      await this.cacheRecipeImage(recipeName, randomDefault, 'default');
      
      return randomDefault;
      
    } catch (error) {
      console.error('Error getting recipe image:', error);
      
      // Último fallback
      return this.getDefaultFoodImages()[0];
    }
  }

  /**
   * Obtiene múltiples imágenes para un lote de recetas
   */
  public async getRecipeImages(recipeNames: string[]): Promise<Record<string, string>> {
    const images: Record<string, string> = {};
    
    // Procesar en paralelo con límite para no sobrecargar la API
    const batchSize = 3;
    for (let i = 0; i < recipeNames.length; i += batchSize) {
      const batch = recipeNames.slice(i, i + batchSize);
      const batchPromises = batch.map(async (name) => {
        const image = await this.getRecipeImage(name);
        return { name, image };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ name, image }) => {
        images[name] = image;
      });
      
      // Pequeña pausa entre lotes para respetar rate limits
      if (i + batchSize < recipeNames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return images;
  }

  /**
   * Limpia imágenes cacheadas antiguas (para ejecutar periódicamente)
   */
  public async cleanOldCachedImages(daysOld: number = 30): Promise<void> {
    try {
      await supabaseService.deleteOldCachedImages(daysOld);
    } catch (error) {
      console.error('Error cleaning old cached images:', error);
    }
  }
}

export default new ImageService();