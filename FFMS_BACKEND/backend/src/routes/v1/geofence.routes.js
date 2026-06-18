const router = require('express').Router()
const controller = require('../../controllers/geofence.controller')
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate.middleware')
const {
  pingSchema, createZoneSchema, updateZoneSchema, assignZoneSchema
} = require('../../validations/geofence.validation')

router.use(authenticate)
router.use(checkOrgAccess)

// ── GPS ping (field staff only) ───────────────────────────────────
router.post('/ping',             authorize('FIELD_STAFF'), validate(pingSchema),       controller.ping)

// ── Routes ────────────────────────────────────────────────────────
router.get('/route/today',                                   controller.todayRoute)
router.get('/route/:userId',     authorize('MANAGER','ADMIN'), controller.todayRoute)

// ── Zones (admin manages) ─────────────────────────────────────────
router.post('/zones',            authorize('ADMIN'),         validate(createZoneSchema), controller.createZone)
router.get('/zones',                                         controller.getZones)
router.put('/zones/:id',         authorize('ADMIN'),         validate(updateZoneSchema), controller.updateZone)
router.delete('/zones/:id',      authorize('ADMIN'),         controller.deleteZone)
router.post('/zones/:id/assign', authorize('ADMIN','MANAGER'), validate(assignZoneSchema), controller.assignZone)

// ── Alerts ────────────────────────────────────────────────────────
router.get('/alerts',            authorize('ADMIN','MANAGER'), controller.getAlerts)
router.put('/alerts/:id/resolve',authorize('ADMIN','MANAGER'), controller.resolveAlert)

module.exports = router