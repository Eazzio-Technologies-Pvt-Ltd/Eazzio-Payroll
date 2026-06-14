const prisma                = require('../config/prisma')
const notificationService   = require('./notification.service')
const cloudinary            = require('../config/cloudinary')
const logger                = require('../config/logger')
const { BadRequestError }   = require('../utils/errors')
// Socket.IO emitter — real-time status push to mobile app
const { emitToUser }        = require('../config/socket')

/**
 * Upload receipt image to Cloudinary
 */
const uploadReceiptImage = async (base64Str) => {
  try {
    const formatted = base64Str.startsWith('data:image')
      ? base64Str
      : `data:image/jpeg;base64,${base64Str}`;
    const res = await cloudinary.uploader.upload(formatted, {
      folder: 'ffms/receipts',
      resource_type: 'image',
    });
    return res.secure_url;
  } catch (err) {
    logger.error('Failed to upload expense receipt image to Cloudinary:', err);
    throw new BadRequestError('Failed to upload expense receipt image');
  }
};

// ─── Create draft ─────────────────────────────────────────────────
const createExpense = async (userId, data) => {
  let receiptUrl = data.receiptUrl;
  if (data.receiptBase64) {
    receiptUrl = await uploadReceiptImage(data.receiptBase64);
  }
  return prisma.expense.create({
    data: {
      userId,
      category:    data.category,
      amount:      data.amount,
      description: data.description,
      receiptUrl,
      date:        new Date(data.date),
      taskId:      data.taskId,
      status:      'DRAFT',
    }
  })
}

// ─── Update draft (only if DRAFT) ────────────────────────────────
const updateExpense = async (expenseId, userId, data) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
  if (!expense) {
    const err = new Error('Expense not found'); err.statusCode = 404; throw err
  }
  if (expense.userId !== userId) {
    const err = new Error('Not authorised'); err.statusCode = 403; throw err
  }
  if (expense.status !== 'DRAFT') {
    const err = new Error('Only draft expenses can be edited'); err.statusCode = 400; throw err
  }

  const { receiptBase64, ...updateData } = data;
  if (receiptBase64) {
    updateData.receiptUrl = await uploadReceiptImage(receiptBase64);
  }

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...updateData,
      ...(updateData.date && { date: new Date(updateData.date) })
    }
  })
}

// ─── Submit for approval ──────────────────────────────────────────
const submitExpense = async (expenseId, userId) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
  if (!expense) {
    const err = new Error('Expense not found'); err.statusCode = 404; throw err
  }
  if (expense.userId !== userId) {
    const err = new Error('Not authorised'); err.statusCode = 403; throw err
  }
  if (expense.status !== 'DRAFT') {
    const err = new Error('Only draft expenses can be submitted'); err.statusCode = 400; throw err
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data:  { status: 'SUBMITTED' }
  })

  // Notify manager
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { name: true, managerId: true }
  })
  if (user?.managerId) {
    await notificationService.createNotification({
      userId:      user.managerId,
      title:       'New Expense Claim',
      body:        `${user.name} submitted an expense claim of ₹${expense.amount}`,
      type:        'SYSTEM',
      referenceId: expenseId,
    })
  }

  return updated
}

// ─── Approve ──────────────────────────────────────────────────────
const approveExpense = async (expenseId, managerId, approvalNote) => {
  const expense = await prisma.expense.findUnique({
    where:   { id: expenseId },
    include: { user: { select: { name: true } } }
  })
  if (!expense) {
    const err = new Error('Expense not found'); err.statusCode = 404; throw err
  }
  if (expense.status !== 'SUBMITTED') {
    const err = new Error('Only submitted expenses can be approved'); err.statusCode = 400; throw err
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data:  { status: 'APPROVED', approvedById: managerId, approvalNote }
  })

  // Notify staff via persistent notification
  await notificationService.createNotification({
    userId:      expense.userId,
    title:       'Expense Approved',
    body:        `Your expense claim of ₹${expense.amount} has been approved`,
    type:        'SYSTEM',
    referenceId: expenseId,
  })

  // Real-time socket push so mobile app updates immediately without manual refresh
  emitToUser(expense.userId, 'expense:status_updated', {
    expenseId,
    status:      'APPROVED',
    approvedById: managerId,
    approvalNote,
    message:     `Your expense claim of ₹${expense.amount} has been approved`,
  });

  return updated
}

// ─── Reject ───────────────────────────────────────────────────────
const rejectExpense = async (expenseId, managerId, approvalNote) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
  if (!expense) {
    const err = new Error('Expense not found'); err.statusCode = 404; throw err
  }
  if (expense.status !== 'SUBMITTED') {
    const err = new Error('Only submitted expenses can be rejected'); err.statusCode = 400; throw err
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data:  { status: 'REJECTED', approvedById: managerId, approvalNote }
  })

  // Notify staff via persistent notification
  await notificationService.createNotification({
    userId:      expense.userId,
    title:       'Expense Rejected',
    body:        `Your expense claim of ₹${expense.amount} was rejected. ${approvalNote || ''}`,
    type:        'SYSTEM',
    referenceId: expenseId,
  })

  // Real-time socket push so mobile app updates immediately without manual refresh
  emitToUser(expense.userId, 'expense:status_updated', {
    expenseId,
    status:      'REJECTED',
    approvedById: managerId,
    approvalNote,
    message:     `Your expense claim of ₹${expense.amount} was rejected. ${approvalNote || ''}`,
  });

  return updated
}

// ─── Delete (only DRAFT) ─────────────────────────────────────────
const deleteExpense = async (expenseId, userId) => {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
  if (!expense) {
    const err = new Error('Expense not found'); err.statusCode = 404; throw err
  }
  if (expense.userId !== userId) {
    const err = new Error('Not authorised'); err.statusCode = 403; throw err
  }
  if (expense.status !== 'DRAFT') {
    const err = new Error('Only draft expenses can be deleted'); err.statusCode = 400; throw err
  }
  return prisma.expense.delete({ where: { id: expenseId } })
}

// ─── Get my expenses ──────────────────────────────────────────────
const getMyExpenses = async (userId, { page = 1, limit = 10, status } = {}) => {
  const where = { userId, ...(status && { status }) }
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.expense.count({ where }),
  ])
  return { expenses, total, page, limit }
}

// ─── Get team expenses (manager) ──────────────────────────────────
const getTeamExpenses = async (managerId, { page = 1, limit = 10, status } = {}) => {
  const subordinates = await prisma.user.findMany({
    where:  { managerId },
    select: { id: true }
  })
  const userIds = subordinates.map(u => u.id)

  const where = {
    userId: { in: userIds },
    ...(status && { status })
  }
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            manager: { select: { name: true } }
          }
        }
      }
    }),
    prisma.expense.count({ where }),
  ])
  return { expenses, total, page, limit }
}

// ─── Get all expenses (admin) ─────────────────────────────────────
const getAllExpenses = async (orgId, { page = 1, limit = 10, status, userId } = {}) => {
  const where = {
    user: { organizationId: orgId },
    ...(status && { status }),
    ...(userId && { userId }),
  }
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            manager: { select: { name: true } }
          }
        },
        approvedBy: { select: { id: true, name: true } },
      }
    }),
    prisma.expense.count({ where }),
  ])
  return { expenses, total, page, limit }
}

// ─── Get expense summary (admin) ──────────────────────────────────
const getExpenseSummary = async (orgId) => {
  const where = { user: { organizationId: orgId } }
  
  const totalClaims = await prisma.expense.count({ where })
  const approvedClaims = await prisma.expense.count({ where: { ...where, status: 'APPROVED' } })
  const pendingClaims = await prisma.expense.count({ where: { ...where, status: 'SUBMITTED' } })
  const rejectedClaims = await prisma.expense.count({ where: { ...where, status: 'REJECTED' } })

  const approvedSumAgg = await prisma.expense.aggregate({
    where: { ...where, status: 'APPROVED' },
    _sum: { amount: true }
  })
  
  const pendingSumAgg = await prisma.expense.aggregate({
    where: { ...where, status: 'SUBMITTED' },
    _sum: { amount: true }
  })

  const categoryGroups = await prisma.expense.groupBy({
    by: ['category'],
    where,
    _sum: { amount: true }
  })

  return {
    totalClaims,
    approvedClaims,
    pendingClaims,
    rejectedClaims,
    totalExpenseBurn: approvedSumAgg._sum.amount || 0,
    pendingSum: pendingSumAgg._sum.amount || 0,
    categorySums: categoryGroups.map(g => ({ name: g.category, amount: g._sum.amount || 0 }))
  }
}

module.exports = {
  createExpense, updateExpense, submitExpense,
  approveExpense, rejectExpense, deleteExpense,
  getMyExpenses, getTeamExpenses, getAllExpenses, getExpenseSummary
}