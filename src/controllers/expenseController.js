const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { computeSplit } = require('../services/splitService');
const AppError = require('../utils/appError');

// Menambah pengeluaran baru di dalam grup
const createExpense = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id;
    const {
      amount,
      description,
      category = 'General',
      paidBy = req.user._id,
      splitType = 'equal',
      participantIds,
      customShares,
      date,
    } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return next(new AppError('Group not found', 404));
    }

    // Pastikan pembuat expense adalah anggota grup
    const isCallerMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isCallerMember) {
      return next(new AppError('You are not a member of this group', 403));
    }

    // Pastikan paidBy adalah anggota grup
    const isPayerMember = group.members.some(
      (m) => m.toString() === paidBy.toString()
    );
    if (!isPayerMember) {
      return next(new AppError('The user who paid is not a member of this group', 400));
    }

    // Tentukan anggota yang ikut patungan
    let splitMembers = [];
    if (splitType === 'equal') {
      if (participantIds && participantIds.length > 0) {
        // Validasi semua partisipan adalah anggota grup
        for (const pId of participantIds) {
          const valid = group.members.some((m) => m.toString() === pId.toString());
          if (!valid) {
            return next(new AppError(`User ${pId} is not a member of this group`, 400));
          }
        }
        splitMembers = participantIds;
      } else {
        // Default ke semua anggota grup
        splitMembers = group.members.map((m) => m.toString());
      }
    } else if (splitType === 'custom') {
      // Validasi semua yang ada di customShares adalah anggota grup
      for (const share of customShares || []) {
        const valid = group.members.some((m) => m.toString() === share.user.toString());
        if (!valid) {
          return next(new AppError(`User ${share.user} in custom split is not in this group`, 400));
        }
      }
    }

    // Hitung pembagian tagihan melalui pure service splitService
    const splitDetails = computeSplit({
      splitType,
      amount,
      members: splitMembers,
      customShares,
    });

    const expense = await Expense.create({
      groupId,
      paidBy,
      amount,
      description,
      category,
      splitType,
      splitDetails,
      date: date || new Date(),
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('splitDetails.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: {
        expense: populatedExpense,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mendapatkan daftar pengeluaran dalam satu grup (bisa difilter kategori/tanggal)
const getExpensesByGroup = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return next(new AppError('Group not found', 404));
    }

    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new AppError('You are not a member of this group', 403));
    }

    const query = { groupId };

    // Filter berdasarkan kategori jika ada di query param
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter berdasarkan rentang tanggal
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
    }

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name email')
      .populate('splitDetails.user', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        expenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mengubah/edit pengeluaran
const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);
    if (!expense) {
      return next(new AppError('Expense not found', 404));
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return next(new AppError('Associated group not found', 404));
    }

    // Hanya pembayar (paidBy) atau pembuat grup yang boleh mengedit
    const isPayer = expense.paidBy.toString() === req.user._id.toString();
    const isGroupCreator = group.createdBy.toString() === req.user._id.toString();
    if (!isPayer && !isGroupCreator) {
      return next(new AppError('Not authorized to edit this expense', 403));
    }

    const {
      amount = expense.amount,
      description = expense.description,
      category = expense.category,
      paidBy = expense.paidBy,
      splitType = expense.splitType,
      participantIds,
      customShares,
      date = expense.date,
    } = req.body;

    let splitDetails = expense.splitDetails;

    // Jika ada perubahan nominal atau jenis pembagian, hitung ulang
    if (req.body.amount || req.body.splitType || req.body.participantIds || req.body.customShares) {
      let splitMembers = [];
      if (splitType === 'equal') {
        splitMembers = participantIds && participantIds.length > 0
          ? participantIds
          : group.members.map((m) => m.toString());
      }

      splitDetails = computeSplit({
        splitType,
        amount,
        members: splitMembers,
        customShares,
      });
    }

    expense.amount = amount;
    expense.description = description;
    expense.category = category;
    expense.paidBy = paidBy;
    expense.splitType = splitType;
    expense.splitDetails = splitDetails;
    expense.date = date;

    await expense.save();

    const updatedExpense = await Expense.findById(id)
      .populate('paidBy', 'name email')
      .populate('splitDetails.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: {
        expense: updatedExpense,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Menghapus pengeluaran
const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);
    if (!expense) {
      return next(new AppError('Expense not found', 404));
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return next(new AppError('Associated group not found', 404));
    }

    // Hanya pembayar atau pembuat grup yang boleh menghapus
    const isPayer = expense.paidBy.toString() === req.user._id.toString();
    const isGroupCreator = group.createdBy.toString() === req.user._id.toString();
    if (!isPayer && !isGroupCreator) {
      return next(new AppError('Not authorized to delete this expense', 403));
    }

    await Expense.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getExpensesByGroup,
  updateExpense,
  deleteExpense,
};
