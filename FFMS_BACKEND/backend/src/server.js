const dotenvResult = require('dotenv').config();
const logger = require('./config/logger');
// Start background job workers
require('./jobs/geofenceAlert.job');
require('./jobs/locationWrite.job');
logger.info('locationWrite worker started');
const { initPayrollCron } = require('./jobs/payrollCron.job');

const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
const prisma = require('./config/prisma');

const PORT = (dotenvResult.parsed && dotenvResult.parsed.PORT) || process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Bind Socket.IO
initSocket(server);

// Start server
server.listen(PORT, async () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`Swagger API Docs available at http://localhost:${PORT}/api/v1/docs`);
  
  // Initialize scheduled jobs
  try {
    await initPayrollCron();
    const { startRecurringTaskWorker } = require('./workers/recurringTasks');
    startRecurringTaskWorker();
  } catch (err) {
    logger.error('Failed to initialize cron jobs', err.message);
  }
});

// Unhandled Promise Rejections handler
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION!', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });

  // Do not crash the server for Upstash free tier Redis limits
  if (err.message && err.message.includes('max requests limit exceeded')) {
    logger.warn('Ignoring Redis max requests limit error. Background jobs may not work.');
    return;
  }
  
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
});

// Uncaught Exceptions handler
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION!', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });

  // Do not crash the server for Upstash free tier Redis limits
  if (err.message && err.message.includes('max requests limit exceeded')) {
    logger.warn('Ignoring Redis max requests limit error in uncaughtException. Background jobs may not work.');
    return;
  }

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
});

// Trigger nodemon restart - Cloudinary credentials updated
