const router     = require('express').Router()
const controller = require('../../controllers/notification.controller')
const { authenticate, checkOrgAccess } = require('../../middleware/auth.middleware')

router.use(authenticate)
router.use(checkOrgAccess)

router.post('/send',         controller.send)
router.get('/all',           controller.getAll)
router.get('/',              controller.getMy)
router.get('/unread-count',  controller.unreadCount)
router.put('/read-all',      controller.markAllRead)
router.put('/:id/read',      controller.markRead)
router.delete('/:id',        controller.remove)

module.exports = router