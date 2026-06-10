const { Queue } = require('bullmq')
const connection = require('../config/redis')

const defaultJobOptions = {
  removeOnComplete: true,
  removeOnFail: 50,
}

const geofenceAlertQueue = new Queue('geofence-alerts', { connection, defaultJobOptions })
const notificationQueue  = new Queue('notifications',   { connection, defaultJobOptions })

module.exports = { geofenceAlertQueue, notificationQueue }