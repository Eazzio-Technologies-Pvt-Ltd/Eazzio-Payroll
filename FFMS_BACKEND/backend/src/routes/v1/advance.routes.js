const router     = require('express').Router();
const controller = require('../../controllers/advance.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createAdvanceSchema } = require('../../validations/advance.validation');

router.use(authenticate);
router.use(checkOrgAccess);

// Field staff requesting/getting own advances
router.post('/', validate(createAdvanceSchema), controller.create);
router.get('/my', controller.getMy);

// Manager + Admin viewing/managing advances
router.get('/all', authorize('MANAGER', 'ADMIN'), controller.getAll);
router.put('/:id/approve', authorize('MANAGER', 'ADMIN'), controller.approve);
router.put('/:id/reject', authorize('MANAGER', 'ADMIN'), controller.reject);

module.exports = router;
