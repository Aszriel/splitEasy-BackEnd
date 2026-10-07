const express = require('express');
const { recordSettlement } = require('../controllers/settlementController');
const { requireAuth } = require('../middlewares/auth');
const { validate, createSettlementSchema } = require('../middlewares/validate');

const router = express.Router();

router.use(requireAuth);

router.post('/', validate(createSettlementSchema), recordSettlement);

module.exports = router;
