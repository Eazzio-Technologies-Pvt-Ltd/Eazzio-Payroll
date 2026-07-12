const router     = require('express').Router()
const controller = require('../../controllers/expense.controller')
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate.middleware')
const { createExpenseSchema, updateExpenseSchema, approveRejectSchema } = require('../../validations/expense.validation')

router.use(authenticate)
router.use(checkOrgAccess)

// ── Any logged-in user ────────────────────────────────────────────
router.post('/',              validate(createExpenseSchema), controller.create)
router.get('/my',             controller.getMy)

// ── Manager + Admin ───────────────────────────────────────────────
router.get('/team',           authorize('MANAGER', 'ADMIN'), controller.getTeam)
router.get('/all',            authorize('ADMIN'),             controller.getAll)
router.get('/summary',        authorize('ADMIN', 'MANAGER'), controller.getSummary)

// ── Param routes last ─────────────────────────────────────────────
router.put('/:id',            validate(updateExpenseSchema),  controller.update)
router.put('/:id/submit',     controller.submit)
router.put('/:id/approve',    authorize('MANAGER', 'ADMIN'),  validate(approveRejectSchema), controller.approve)
router.put('/:id/reject',     authorize('MANAGER', 'ADMIN'),  validate(approveRejectSchema), controller.reject)
router.delete('/:id',         controller.remove)

module.exports = router