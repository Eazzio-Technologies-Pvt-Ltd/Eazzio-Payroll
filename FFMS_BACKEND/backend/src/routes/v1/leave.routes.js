const router = require('express').Router()
const controller = require('../../controllers/leave.controller')
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate.middleware')
const { applyLeaveSchema, approveRejectSchema } = require('../../validations/leave.validation')

router.use(authenticate)
router.use(checkOrgAccess)

// ── Any logged-in user ────────────────────────────────────────────
router.post('/apply',      validate(applyLeaveSchema),  controller.apply)
router.get('/my',                                        controller.myLeaves)
router.get('/balance',                                   controller.balance)

// ── Manager + Admin ───────────────────────────────────────────────
router.get('/team',        authorize('MANAGER', 'ADMIN'), controller.teamLeaves)
router.get('/all',         authorize('ADMIN'),             controller.allLeaves)
router.get('/report',      authorize('ADMIN', 'MANAGER'),  controller.consolidatedReport)

// ── Param routes last (always) ────────────────────────────────────
router.put('/:id/approve', authorize('MANAGER', 'ADMIN'), validate(approveRejectSchema), controller.approve)
router.put('/:id/reject',  authorize('MANAGER', 'ADMIN'), validate(approveRejectSchema), controller.reject)
router.delete('/:id',                                      controller.cancel)

module.exports = router