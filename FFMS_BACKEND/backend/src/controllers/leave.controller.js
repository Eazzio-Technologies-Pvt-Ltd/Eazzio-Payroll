const leaveService = require('../services/leave.service')
const { successResponse } = require('../utils/response')

const apply = async (req, res, next) => {
  try {
    const leave = await leaveService.applyLeave(req.user.id, req.body)
    return successResponse(res, leave, 201)
  } catch (err) { next(err) }
}

const approve = async (req, res, next) => {
  try {
    const leave = await leaveService.approveLeave(req.params.id, req.user.id, req.body.approvalNote)
    return successResponse(res, leave)
  } catch (err) { next(err) }
}

const reject = async (req, res, next) => {
  try {
    const leave = await leaveService.rejectLeave(req.params.id, req.user.id, req.body.approvalNote)
    return successResponse(res, leave)
  } catch (err) { next(err) }
}

const cancel = async (req, res, next) => {
  try {
    await leaveService.cancelLeave(req.params.id, req.user.id)
    return successResponse(res, { message: 'Leave cancelled' })
  } catch (err) { next(err) }
}

const myLeaves = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const data = await leaveService.getMyLeaves(req.user.id, {
      page: +page || 1,
      limit: +limit || 10,
      status,
    })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const teamLeaves = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const data = await leaveService.getTeamLeaves(req.user.id, {
      page: +page || 1,
      limit: +limit || 10,
      status,
    })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const allLeaves = async (req, res, next) => {
  try {
    const { page, limit, status, userId } = req.query
    const data = await leaveService.getAllLeaves({ page: +page || 1, limit: +limit || 10, status, userId })
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const balance = async (req, res, next) => {
  try {
    const data = await leaveService.getLeaveBalance(req.user.id)
    return successResponse(res, data)
  } catch (err) { next(err) }
}

const consolidatedReport = async (req, res, next) => {
  try {
    const data = await leaveService.getConsolidatedReport(req.user.organizationId)
    return successResponse(res, data)
  } catch (err) { next(err) }
}

module.exports = { apply, approve, reject, cancel, myLeaves, teamLeaves, allLeaves, balance, consolidatedReport }