const notificationService = require('../services/notification.service')
const { successResponse } = require('../utils/response')

const getMy = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const data = await notificationService.getMyNotifications(req.user.id, {
      page: +page || 1, limit: +limit || 20
    })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const getAll = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const data = await notificationService.getAllNotifications(req.user.organizationId, {
      page: +page || 1, limit: +limit || 50
    }, req.user)
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const send = async (req, res, next) => {
  try {
    const { userId, title, body, type, referenceId } = req.body
    
    // Normalize type for database enum safety
    let normalizedType = type ? type.toUpperCase() : 'SYSTEM';
    const validTypes = ['TASK', 'ATTENDANCE', 'LEAVE', 'GEOFENCE', 'SYSTEM', 'REPORT'];
    if (!validTypes.includes(normalizedType)) {
      normalizedType = 'SYSTEM';
    }

    const notif = await notificationService.createNotification({
      userId, title, body, type: normalizedType, referenceId
    })
    return successResponse(res, notif, 201)
  } catch (err) { next(err) }
}

const unreadCount = async (req, res, next) => {
  try {
    const data = await notificationService.getUnreadCount(req.user.id)
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const markRead = async (req, res, next) => {
  try {
    const notif = await notificationService.markAsRead(req.params.id, req.user.id)
    return successResponse(res, notif)
  } catch (err) { next(err) }
}

const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id)
    return successResponse(res, result)
  } catch (err) { next(err) }
}

const remove = async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id)
    return successResponse(res, { message: 'Notification deleted' })
  } catch (err) { next(err) }
}

module.exports = { getMy, getAll, send, unreadCount, markRead, markAllRead, remove }