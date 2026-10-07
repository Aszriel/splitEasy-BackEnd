const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, getMe);

module.exports = router;
