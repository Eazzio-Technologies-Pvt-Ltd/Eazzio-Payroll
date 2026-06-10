const geofenceService = require('../services/geofence.service')
const { successResponse } = require('../utils/response')

const ping = async (req, res, next) => {
  try {
    const result = await geofenceService.storePing(req.user.id, req.body)
    return successResponse(res, result)
  } catch (err) { next(err) }
}

const todayRoute = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id
    const data   = await geofenceService.getTodayRoute(userId)
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const createZone = async (req, res, next) => {
  try {
    const zone = await geofenceService.createZone(req.user.organizationId, req.body)
    return successResponse(res, zone, 201)
  } catch (err) { next(err) }
}

const getZones = async (req, res, next) => {
  try {
    const zones = await geofenceService.getZones(req.user.organizationId)
    return successResponse(res, zones)
  } catch (err) { next(err) }
}

const updateZone = async (req, res, next) => {
  try {
    const zone = await geofenceService.updateZone(req.params.id, req.user.organizationId, req.body)
    return successResponse(res, zone)
  } catch (err) { next(err) }
}

const deleteZone = async (req, res, next) => {
  try {
    await geofenceService.deleteZone(req.params.id, req.user.organizationId)
    return successResponse(res, { message: 'Zone deleted' })
  } catch (err) { next(err) }
}

const assignZone = async (req, res, next) => {
  try {
    const result = await geofenceService.assignZoneToUser(
      req.params.id,
      req.body.userId,
      req.user.organizationId
    )
    return successResponse(res, result)
  } catch (err) { next(err) }
}

const getAlerts = async (req, res, next) => {
  try {
    const { page, limit, resolved, userId } = req.query
    const data = await geofenceService.getAlerts(req.user.organizationId, {
      page: +page || 1, limit: +limit || 20, resolved, userId
    })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const resolveAlert = async (req, res, next) => {
  try {
    const alert = await geofenceService.resolveAlert(req.params.id, req.user.organizationId)
    return successResponse(res, alert)
  } catch (err) { next(err) }
}

module.exports = {
  ping, todayRoute,
  createZone, getZones, updateZone, deleteZone, assignZone,
  getAlerts, resolveAlert,
}