const { Worker } = require('bullmq')
const prisma      = require('../config/prisma')
const connection  = require('../config/redis')

const worker = new Worker('geofence-alerts', async (job) => {
  const { userId, territoryId, latitude, longitude } = job.data

  // 1. Save alert to DB
  await prisma.geofenceAlert.create({
    data: { userId, territoryId, latitude, longitude }
  })

  // 2. Save notification to DB
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true }
  })

  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
    select: { name: true }
  })

  await prisma.notification.create({
    data: {
      userId,
      title: 'Zone Violation Alert',
      body: `${user?.name} has left the assigned zone: ${territory?.name}`,
      type: 'GEOFENCE',
      referenceId: territoryId,
    }
  })

  // 3. TODO: send FCM push via notification.js util when ready
  console.log(`[GeofenceAlert] User ${userId} left zone ${territory?.name}`)

}, { 
  connection,
  settings: {
    stalledInterval: 30000,
    guardInterval: 5000,
    retryProcessDelay: 5000,
  }
})

worker.on('failed', (job, err) => {
  console.error(`[GeofenceAlert] Job ${job.id} failed:`, err.message)
})

module.exports = worker