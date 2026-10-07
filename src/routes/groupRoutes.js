const express = require('express');
const {
  createGroup,
  getGroups,
  getGroupById,
  addMember,
} = require('../controllers/groupController');
const { requireAuth } = require('../middlewares/auth');
const {
  validate,
  createGroupSchema,
  addMemberSchema,
} = require('../middlewares/validate');

const {
  getGroupBalances,
  getGroupSettleUp,
  getGroupSummary,
} = require('../controllers/settlementController');

const expenseRoutes = require('./expenseRoutes');

const router = express.Router();

// Semua rute grup membutuhkan autentikasi
router.use(requireAuth);

// Forward ke expense routes untuk endpoint /api/groups/:groupId/expenses
router.use('/:groupId/expenses', expenseRoutes);

router.post('/', validate(createGroupSchema), createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/:id/members', validate(addMemberSchema), addMember);

// Rute Balances, Settle-Up, dan Ringkasan Agregasi
router.get('/:id/balances', getGroupBalances);
router.get('/:id/settle-up', getGroupSettleUp);
router.get('/:id/summary', getGroupSummary);

module.exports = router;
