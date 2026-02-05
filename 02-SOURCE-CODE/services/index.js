/**
 * index.js - Service layer exports
 * Central export point for all AI Command Center services
 */

// Base services
export { BaseService } from './BaseService.js';
export { dataService } from './DataService.js';

// Domain services
export { memoryService } from './memoryService.js';
export { embeddingService } from './embeddingService.js';
export { sessionService } from './sessionService.js';
export { entityService } from './entityService.js';
export { retrievalService } from './retrievalService.js';
export { reminderService } from './reminderService.js';
export { meetingService } from './meetingService.js';
export { dashboardService } from './dashboardService.js';
export { chatService } from './chatService.js';
export { relationshipService } from './relationshipService.js';
export { knowledgeService } from './knowledgeService.js';
export { adminService } from './adminService.js';
export { projectService } from './ProjectService.js';

/**
 * Service layer initialization
 * Call this once when the app starts to verify all services are ready
 */
export async function initializeServices() {
  try {
    // Check database health
    const health = await dataService.checkHealth();

    if (!health.healthy) {
      throw new Error('Database is not healthy');
    }

    // Check embedding service
    const embeddingStatus = await embeddingService.checkOllamaStatus();

    if (!embeddingStatus.available) {
      console.warn('Ollama embedding service not available:', embeddingStatus.error);
      console.warn('Embedding features will use mock embeddings until Ollama is running');
    }

    return {
      database: {
        healthy: health.healthy,
        vectorSearchAvailable: health.vectorSearchAvailable
      },
      embedding: {
        available: embeddingStatus.available,
        model: embeddingStatus.model,
        error: embeddingStatus.error
      }
    };
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Get service health status
 * @returns {Promise<Object>} Health status for all services
 */
export async function getServiceHealth() {
  const dbHealth = await dataService.checkHealth();
  const embeddingStatus = await embeddingService.checkOllamaStatus();

  return {
    timestamp: new Date().toISOString(),
    database: dbHealth,
    embedding: embeddingStatus,
    services: {
      memory: true,
      session: true,
      entity: true,
      retrieval: true
    }
  };
}
