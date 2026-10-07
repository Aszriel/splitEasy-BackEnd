const express = require('express');
const {
  createExpense,
  getExpensesByGroup,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { requireAuth } = require('../middlewares/auth');
const {
  validate,
  createExpenseSchema,
  updateExpenseSchema,
} = require('../middlewares/validate');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

// Rute berbasis grup (/api/groups/:groupId/expenses)
router.post('/', validate(createExpenseSchema), createExpense);
router.get('/', getExpensesByGroup);

// Rute berbasis ID pengeluaran (/api/expenses/:id)
router.put('/:id', validate(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
