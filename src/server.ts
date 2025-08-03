import app from './app';
import config from './config/env';
import logger from './utils/logger';

const server = app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

export default server;