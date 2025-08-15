// src/services/cron.service.ts
import cron from 'node-cron';
import supabaseService from './supabase.service';
import imageService from './unsplash.service';

class CronService {
  
  /**
   * Inicia todas las tareas programadas
   */
  public startCronJobs() {
    this.scheduleCleanExpiredRecipes();
    this.scheduleCleanOldImages();
    this.scheduleWeeklyOptimization();
    
    console.log('🕐 Cron jobs started successfully');
  }

  /**
   * Programa la limpieza de recetas caché expiradas
   * Ejecuta cada 4 horas
   */
  private scheduleCleanExpiredRecipes() {
    cron.schedule('0 */4 * * *', async () => {
      try {
        console.log('🧹 Starting cleanup of expired cached recipes...');
        
        const result = await supabaseService.cleanExpiredCachedRecipes();
        // Para operaciones DELETE, el count está en result.count si está disponible
        const deletedCount = result.count || 0;
        
        console.log(`✅ Cleaned ${deletedCount} expired cached recipes`);
      } catch (error) {
        console.error('❌ Error cleaning expired recipes:', error);
      }
    });
  }

  /**
   * Programa la limpieza de imágenes antiguas
   * Ejecuta diariamente a las 2:00 AM
   */
  private scheduleCleanOldImages() {
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🖼️ Starting cleanup of old cached images...');
        
        // Limpiar imágenes más antiguas que 30 días
        await imageService.cleanOldCachedImages(30);
        
        console.log('✅ Old cached images cleaned successfully');
      } catch (error) {
        console.error('❌ Error cleaning old images:', error);
      }
    });
  }

  /**
   * Programa una tarea personalizada para optimización de base de datos
   * Ejecuta semanalmente los domingos a la 1:00 AM
   */
  private scheduleWeeklyOptimization() {
    cron.schedule('0 1 * * 0', async () => {
      try {
        console.log('🔧 Starting weekly database optimization...');
        
        // Aquí puedes agregar más tareas de optimización si es necesario
        // Por ejemplo: VACUUM, REINDEX, estadísticas, etc.
        
        console.log('✅ Weekly optimization completed');
      } catch (error) {
        console.error('❌ Error in weekly optimization:', error);
      }
    });
  }

  /**
   * Detiene todos los trabajos cron (útil para testing o shutdown)
   */
  public stopAllJobs() {
    cron.getTasks().forEach((task) => {
      task.stop();
    });
    console.log('🛑 All cron jobs stopped');
  }

  /**
   * Obtiene el estado de todos los trabajos cron
   */
  public getJobsStatus() {
    const tasks = cron.getTasks();
    return {
      total_jobs: tasks.size,
      running_jobs: Array.from(tasks.values()).filter(task => task.getStatus() === 'scheduled').length
    };
  }
}

export default new CronService();