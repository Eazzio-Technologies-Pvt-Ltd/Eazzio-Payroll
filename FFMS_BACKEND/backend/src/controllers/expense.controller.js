const expenseService = require('../services/expense.service')
const { successResponse } = require('../utils/response')

const create = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.user.id, req.body)
    return successResponse(res, expense, 201)
  } catch (err) { next(err) }
}

const update = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.user.id, req.body)
    return successResponse(res, expense)
  } catch (err) { next(err) }
}

const submit = async (req, res, next) => {
  try {
    const expense = await expenseService.submitExpense(req.params.id, req.user.id)
    return successResponse(res, expense)
  } catch (err) { next(err) }
}

const approve = async (req, res, next) => {
  try {
    const expense = await expenseService.approveExpense(req.params.id, req.user.id, req.user.organizationId, req.body.approvalNote)
    return successResponse(res, expense)
  } catch (err) { next(err) }
}

const reject = async (req, res, next) => {
  try {
    const expense = await expenseService.rejectExpense(req.params.id, req.user.id, req.user.organizationId, req.body.approvalNote)
    return successResponse(res, expense)
  } catch (err) { next(err) }
}

const remove = async (req, res, next) => {
  try {
    await expenseService.deleteExpense(req.params.id, req.user.id)
    return successResponse(res, { message: 'Expense deleted' })
  } catch (err) { next(err) }
}

const getMy = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const data = await expenseService.getMyExpenses(req.user.id, {
      page: +page || 1, limit: +limit || 10, status
    })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const getTeam = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const data = await expenseService.getTeamExpenses(req.user.id, {
      page: +page || 1, limit: +limit || 10, status
    })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const getAll = async (req, res, next) => {
  try {
    const { page, limit, status, userId } = req.query
    const data = await expenseService.getAllExpenses(req.user.organizationId, {
      page: +page || 1, limit: +limit || 10, status, userId
    })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const getSummary = async (req, res, next) => {
  try {
    const data = await expenseService.getExpenseSummary(req.user.organizationId)
    return successResponse(res, data)
  } catch (err) { next(err) }
}

module.exports = { create, update, submit, approve, reject, remove, getMy, getTeam, getAll, getSummary }