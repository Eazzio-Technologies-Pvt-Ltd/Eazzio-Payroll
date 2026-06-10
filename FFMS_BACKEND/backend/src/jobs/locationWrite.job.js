const { Worker, Queue } = require('bullmq');
const prisma = require('../config/prisma');
const logger = require('../config/logger');
const redisConnection = require('../config/redis');

// The queue — producers add jobs here
const locationWriteQueue = new Queue('locationWrite', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,       // 2s, 4s, 8s between retries
    },
    removeOnComplete: 100,  // keep last 100 completed jobs for debugging
    removeOnFail: 500,      // keep last 500 failed jobs for inspection
  },
});

// The worker — consumes jobs and writes to PostgreSQL
const locationWriteWorker = new Worker(
  'locationWrite',
  async (job) => {
    const { userId, latitude, longitude, accuracy, speed, heading, altitude, batteryLevel, isMoving, recordedAt } = job.data;

    await prisma.locationLog.create({
      data: {
        userId,
        latitude,
        longitude,
        accuracy,
        speed: speed ?? null,
        heading: heading ?? null,
        altitude: altitude ?? null,
        batteryLevel: batteryLevel ?? null,
        isMoving: isMoving ?? true,
        recordedAt: new Date(recordedAt),
      },
    });

    logger.info('locationLog written via BullMQ', { userId, recordedAt });
  },
  {
    connection: redisConnection,
    concurrency: 10,   // process 10 writes in parallel
  }
);

locationWriteWorker.on('failed', (job, err) => {
  logger.error('locationWrite job failed after all retries', {
    jobId: job.id,
    userId: job.data?.userId,
    recordedAt: job.data?.recordedAt,
    error: err.message,
  });
});

module.exports = { locationWriteQueue, locationWriteWorker };
