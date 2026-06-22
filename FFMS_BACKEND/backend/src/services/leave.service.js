const prisma = require('../config/prisma')
const cloudinary = require('../config/cloudinary')
const notificationService = require('./notification.service')
// Socket.IO emitter — real-time status push to mobile app
const { emitToUser } = require('../config/socket')

// Helper: calculate working days between two dates (excludes weekends)
const calcWorkingDays = (startDate, endDate) => {
  let count = 0
  const cur = new Date(startDate)
  const end = new Date(endDate)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Check if new leave dates overlap with any existing approved/pending leave
const checkOverlap = async (userId, startDate, endDate, excludeId = null) => {
  const overlap = await prisma.leave.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'APPROVED'] },
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } },
      ],
    },
  })
  return !!overlap
}

// ─── Apply for leave ───────────────────────────────────────────────
const applyLeave = async (userId, { type, startDate, endDate, reason, attachmentBase64 }) => {
  const hasOverlap = await checkOverlap(userId, startDate, endDate)
  if (hasOverlap) {
    const err = new Error('Leave dates overlap with an existing leave request')
    err.statusCode = 409
    throw err
  }

  const totalDays = calcWorkingDays(startDate, endDate)
  if (totalDays === 0) {
    const err = new Error('Selected dates have no working days')
    err.statusCode = 400
    throw err
  }
  
  let attachmentUrl = null;
  if (attachmentBase64) {
    try {
      const formattedStr = attachmentBase64.startsWith('data:') 
        ? attachmentBase64 
        : `data:image/jpeg;base64,${attachmentBase64}`;

      const res = await cloudinary.uploader.upload(formattedStr, {
        folder: 'ffms/leaves',
        resource_type: 'auto'
      });
      attachmentUrl = res.secure_url;
    } catch (err) {
      throw new Error('Failed to upload leave attachment');
    }
  }

  const leave = await prisma.leave.create({
    data: {
      userId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalDays,
      reason,
      attachmentUrl,
      status: 'PENDING',
    },
  })
  return leave
}

// ─── Approve leave ─────────────────────────────────────────────────
const approveLeave = async (leaveId, managerId, organizationId, approvalNote) => {
  const leave = await prisma.leave.findFirst({
    where: { id: leaveId, user: { organizationId } }
  })
  if (!leave) {
    const err = new Error('Leave request not found'); err.statusCode = 404; throw err
  }
  if (leave.status !== 'PENDING') {
    const err = new Error('Only pending leaves can be approved'); err.statusCode = 400; throw err
  }

  const updated = await prisma.leave.update({
    where: { id: leaveId },
    data: { status: 'APPROVED', approvedById: managerId, approvalNote },
  })

  // Notify employee via persistent notification
  await notificationService.createNotification({
    userId:      leave.userId,
    title:       'Leave Approved',
    body:        `Your leave request for ${leave.totalDays} day(s) starting ${leave.startDate.toISOString().split('T')[0]} has been approved`,
    type:        'SYSTEM',
    referenceId: leaveId,
  }).catch(err => {
    console.error('Failed to create leave approval notification:', err.message);
  })

  // Real-time socket push so mobile app updates immediately without manual refresh
  emitToUser(leave.userId, 'leave:status_updated', {
    leaveId,
    status:      'APPROVED',
    approvedById: managerId,
    approvalNote,
    message:     `Your leave request has been approved`,
  });

  return updated
}

// ─── Reject leave ──────────────────────────────────────────────────
const rejectLeave = async (leaveId, managerId, organizationId, approvalNote) => {
  const leave = await prisma.leave.findFirst({
    where: { id: leaveId, user: { organizationId } }
  })
  if (!leave) {
    const err = new Error('Leave request not found'); err.statusCode = 404; throw err
  }
  if (leave.status !== 'PENDING') {
    const err = new Error('Only pending leaves can be rejected'); err.statusCode = 400; throw err
  }

  const updated = await prisma.leave.update({
    where: { id: leaveId },
    data: { status: 'REJECTED', approvedById: managerId, approvalNote },
  })

  // Notify employee via persistent notification
  await notificationService.createNotification({
    userId:      leave.userId,
    title:       'Leave Rejected',
    body:        `Your leave request for ${leave.totalDays} day(s) starting ${leave.startDate.toISOString().split('T')[0]} was rejected. ${approvalNote || ''}`,
    type:        'SYSTEM',
    referenceId: leaveId,
  }).catch(err => {
    console.error('Failed to create leave rejection notification:', err.message);
  })

  // Real-time socket push so mobile app updates immediately without manual refresh
  emitToUser(leave.userId, 'leave:status_updated', {
    leaveId,
    status:      'REJECTED',
    approvedById: managerId,
    approvalNote,
    message:     `Your leave request has been rejected. ${approvalNote || ''}`,
  });

  return updated
}

// ─── Cancel own leave (only if still PENDING) ─────────────────────
const cancelLeave = async (leaveId, userId) => {
  const leave = await prisma.leave.findUnique({ where: { id: leaveId } })
  if (!leave) {
    const err = new Error('Leave not found'); err.statusCode = 404; throw err
  }
  if (leave.userId !== userId) {
    const err = new Error('Not authorised'); err.statusCode = 403; throw err
  }
  if (leave.status !== 'PENDING') {
    const err = new Error('Only pending leaves can be cancelled'); err.statusCode = 400; throw err
  }

  return prisma.leave.delete({ where: { id: leaveId } })
}

// ─── Get my leaves ─────────────────────────────────────────────────
const getMyLeaves = async (userId, { page = 1, limit = 10, status } = {}) => {
  const where = { userId, ...(status && { status }) }
  const [leaves, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { approvedBy: { select: { id: true, name: true } } },
    }),
    prisma.leave.count({ where }),
  ])
  return { leaves, total, page, limit }
}

// ─── Get team leaves (for manager) ────────────────────────────────
const getTeamLeaves = async (managerId, { page = 1, limit = 10, status } = {}) => {
  // Get all staff under this manager
  const subordinates = await prisma.user.findMany({
    where: { managerId },
    select: { id: true },
  })
  const userIds = subordinates.map(u => u.id)

  const where = { userId: { in: userIds }, ...(status && { status }) }
  const [leaves, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, employeeId: true, profileImage: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.leave.count({ where }),
  ])
  return { leaves, total, page, limit }
}

// ─── Get all leaves (admin) ────────────────────────────────────────
const getAllLeaves = async (organizationId, { page = 1, limit = 10, status, userId } = {}) => {
  const where = {
    user: { organizationId },
    ...(status && { status }),
    ...(userId && { userId }),
  }
  const [leaves, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, employeeId: true, profileImage: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.leave.count({ where }),
  ])
  return { leaves, total, page, limit }
}

// ─── Leave balance (used/remaining by type this year) ─────────────
const LEAVE_QUOTA = { SICK: 10, CASUAL: 12, EARNED: 15, UNPAID: 999, OTHER: 5 }

const getLeaveBalance = async (userId) => {
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  const yearEnd   = new Date(new Date().getFullYear(), 11, 31)

  const approved = await prisma.leave.findMany({
    where: {
      userId,
      status: 'APPROVED',
      startDate: { gte: yearStart },
      endDate:   { lte: yearEnd },
    },
    select: { type: true, totalDays: true },
  })

  const used = {}
  for (const l of approved) {
    used[l.type] = (used[l.type] || 0) + l.totalDays
  }

  const balance = Object.entries(LEAVE_QUOTA).map(([type, quota]) => ({
    type,
    allocated: quota,
    used: used[type] || 0,
    remaining: quota - (used[type] || 0),
  }))

  return balance
}

// ─── Consolidated Leave Report (Admin) ──────────────────────────────
const getConsolidatedReport = async (organizationId) => {
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  const yearEnd   = new Date(new Date().getFullYear(), 11, 31)

  // Fetch all users in the organization
  const users = await prisma.user.findMany({
    where: { organizationId, status: 'ACTIVE' },
    select: { id: true, name: true, employeeId: true, role: true }
  })

  // Fetch all approved leaves this year
  const approvedLeaves = await prisma.leave.findMany({
    where: {
      user: { organizationId },
      status: 'APPROVED',
      startDate: { gte: yearStart },
      endDate:   { lte: yearEnd },
    },
    select: { userId: true, type: true, totalDays: true },
  })

  const report = users.map(user => {
    const userLeaves = approvedLeaves.filter(l => l.userId === user.id)
    
    const used = {}
    for (const l of userLeaves) {
      used[l.type] = (used[l.type] || 0) + l.totalDays
    }

    const balances = Object.entries(LEAVE_QUOTA).map(([type, quota]) => ({
      type,
      allocated: quota,
      used: used[type] || 0,
      remaining: quota - (used[type] || 0),
    }))

    const totalUsed = Object.values(used).reduce((a, b) => a + b, 0)

    return {
      userId: user.id,
      name: user.name,
      employeeId: user.employeeId,
      role: user.role,
      balances,
      totalUsed
    }
  })

  return report
}

module.exports = {
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getMyLeaves,
  getTeamLeaves,
  getAllLeaves,
  getLeaveBalance,
  getConsolidatedReport,
}