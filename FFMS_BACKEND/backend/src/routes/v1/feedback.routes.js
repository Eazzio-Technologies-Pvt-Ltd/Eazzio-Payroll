const router = require('express').Router();
const controller = require('../../controllers/feedback.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

// ── Unauthenticated / Anonymous ───────────────────────────────────
// Anyone can submit anonymous feedback as long as they provide a valid orgId in body.
// NO authentication middleware is intentionally used here.
router.post('/submit', controller.submit);

// ── Manager + Admin (Authenticated) ───────────────────────────────
router.use(authenticate);
router.use(checkOrgAccess);

router.get('/all', authorize('MANAGER', 'ADMIN'), controller.getList);

module.exports = router;
