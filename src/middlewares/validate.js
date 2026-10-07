const { z } = require('zod');

// Middleware pemroses validasi skema Zod
const validate = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    next(error);
  }
};

// Skema validasi untuk Autentikasi
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

// Skema validasi untuk Grup
const createGroupSchema = z.object({
  name: z
    .string({ required_error: 'Group name is required' })
    .trim()
    .min(2, 'Group name must be at least 2 characters'),
});

const addMemberSchema = z.object({
  email: z
    .string({ required_error: 'Member email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
});

// Skema validasi untuk Pengeluaran (Expense)
const createExpenseSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty'),
  category: z.string().trim().optional(),
  paidBy: z.string().optional(),
  splitType: z.enum(['equal', 'custom']).default('equal'),
  participantIds: z.array(z.string()).optional(),
  customShares: z
    .array(
      z.object({
        user: z.string({ required_error: 'User ID is required in custom share' }),
        amount: z.number().min(0, 'Share amount cannot be negative'),
      })
    )
    .optional(),
  date: z.string().datetime().or(z.date()).optional(),
});

const updateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0').optional(),
  description: z.string().trim().min(1, 'Description cannot be empty').optional(),
  category: z.string().trim().optional(),
  paidBy: z.string().optional(),
  splitType: z.enum(['equal', 'custom']).optional(),
  participantIds: z.array(z.string()).optional(),
  customShares: z
    .array(
      z.object({
        user: z.string(),
        amount: z.number().min(0),
      })
    )
    .optional(),
  date: z.string().datetime().or(z.date()).optional(),
});

const createSettlementSchema = z.object({
  groupId: z.string({ required_error: 'Group ID is required' }),
  to: z.string({ required_error: 'Recipient user ID (to) is required' }),
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Settlement amount must be greater than 0'),
  date: z.string().datetime().or(z.date()).optional(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createGroupSchema,
  addMemberSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createSettlementSchema,
};


