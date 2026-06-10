const prisma = require('../config/prisma')
const { emitToUser } = require('../config/socket')

// ─── Create a notification record ─────────────────────────────────
const createNotification = async ({ userId, title, body, type, referenceId }) => {
  const notif = await prisma.notification.create({
    data: { userId, title, body, type, referenceId }
  })
  
  // Real-time broadcast
  emitToUser(userId, 'notification:new', notif)
  
  return notif
}

// ─── Create notification for multiple users at once ───────────────
const createBulkNotifications = async (userIds, { title, body, type, referenceId }) => {
  const data = userIds.map(userId => ({ userId, title, body, type, referenceId }))
  const res = await prisma.notification.createMany({ data })

  // Real-time broadcast
  userIds.forEach(userId => {
    emitToUser(userId, 'notification:new', {
      title, body, type, referenceId, createdAt: new Date()
    })
  })

  return res
}

// ─── Get my notifications ──────────────────────────────────────────
const getMyNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])
  return { notifications, total, unreadCount, page, limit }
}

// ─── Get all notifications (Admin) ─────────────────────────────────
const getAllNotifications = async (organizationId, { page = 1, limit = 50 } = {}, requestingUser = null) => {
  const where = {
    user: { organizationId }
  }

  if (requestingUser && requestingUser.role === 'MANAGER') {
    where.OR = [
      { userId: requestingUser.id },
      { user: { managerId: requestingUser.id } }
    ]
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        user: { select: { id: true, name: true, employeeId: true } }
      }
    }),
    prisma.notification.count({ where }),
  ])
  return { notifications, total, page, limit }
}

// ─── Get unread count only ────────────────────────────────────────
const getUnreadCount = async (userId) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false }
  })
  return { unreadCount: count }
}

// ─── Mark one as read ─────────────────────────────────────────────
const markAsRead = async (notificationId, userId) => {
  const notif = await prisma.notification.findUnique({
    where: { id: notificationId }
  })
  if (!notif) {
    const err = new Error('Notification not found'); err.statusCode = 404; throw err
  }
  if (notif.userId !== userId) {
    const err = new Error('Not authorised'); err.statusCode = 403; throw err
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data:  { isRead: true }
  })
}

// ─── Mark all as read ─────────────────────────────────────────────
const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  })
  return { updated: result.count }
}

// ─── Delete one ───────────────────────────────────────────────────
const deleteNotification = async (notificationId, userId) => {
  const notif = await prisma.notification.findUnique({
    where: { id: notificationId }
  })
  if (!notif) {
    const err = new Error('Notification not found'); err.statusCode = 404; throw err
  }
  if (notif.userId !== userId) {
    const err = new Error('Not authorised'); err.statusCode = 403; throw err
  }
  return prisma.notification.delete({ where: { id: notificationId } })
}

module.exports = {
  createNotification,
  createBulkNotifications,
  getMyNotifications,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
}