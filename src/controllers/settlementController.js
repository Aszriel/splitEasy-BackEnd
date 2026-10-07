const mongoose = require('mongoose');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const { computeNetBalances, computeSettlement } = require('../services/settleUpService');
const AppError = require('../utils/appError');

// Mendapatkan saldo bersih (net balances) tiap anggota grup
const getGroupBalances = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id;

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
      return next(new AppError('Group not found', 404));
    }

    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new AppError('You are not a member of this group', 403));
    }

    const expenses = await Expense.find({ groupId });
    const settlements = await Settlement.find({ groupId, status: 'paid' });

    const rawBalances = computeNetBalances(group.members, expenses, settlements);

    // Format respon agar menyertakan info user
    const balances = group.members.map((member) => {
      const uId = member._id.toString();
      const netBalance = rawBalances[uId] || 0;
      return {
        user: member,
        netBalance,
        status: netBalance > 0 ? 'owed' : netBalance < 0 ? 'owes' : 'settled',
      };
    });

    res.status(200).json({
      success: true,
      data: {
        balances,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mendapatkan daftar transfer penyelesaian utang minimum (Algoritma Greedy)
const getGroupSettleUp = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id;

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
      return next(new AppError('Group not found', 404));
    }

    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new AppError('You are not a member of this group', 403));
    }

    const expenses = await Expense.find({ groupId });
    const settlements = await Settlement.find({ groupId, status: 'paid' });

    const rawBalances = computeNetBalances(group.members, expenses, settlements);
    const rawTransfers = computeSettlement(rawBalances);

    // Map ID ke detail objek user untuk kenyamanan frontend
    const userMap = new Map(group.members.map((m) => [m._id.toString(), m]));

    const transfers = rawTransfers.map((t) => ({
      from: userMap.get(t.from) || { _id: t.from },
      to: userMap.get(t.to) || { _id: t.to },
      amount: t.amount,
    }));

    res.status(200).json({
      success: true,
      message: 'Settlement plan computed successfully',
      data: {
        transfers,
        totalTransfersCount: transfers.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mencatat transaksi pelunasan utang (Mark as Paid)
const recordSettlement = async (req, res, next) => {
  try {
    const { groupId, to, amount, date } = req.body;
    const from = req.user._id;

    if (from.toString() === to.toString()) {
      return next(new AppError('You cannot settle debt to yourself', 400));
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return next(new AppError('Group not found', 404));
    }

    // Pastikan kedua pihak adalah anggota grup
    const isCallerMember = group.members.some((m) => m.toString() === from.toString());
    const isRecipientMember = group.members.some((m) => m.toString() === to.toString());

    if (!isCallerMember || !isRecipientMember) {
      return next(new AppError('Both users must be members of the group', 400));
    }

    const settlement = await Settlement.create({
      groupId,
      from,
      to,
      amount,
      status: 'paid',
      date: date || new Date(),
    });

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('groupId', 'name');

    res.status(201).json({
      success: true,
      message: 'Settlement recorded as paid successfully',
      data: {
        settlement: populatedSettlement,
      },
    });
  } catch (error) {
    next(error);
  }
};

// MongoDB Aggregation Pipeline untuk Ringkasan Pengeluaran Grup
const getGroupSummary = async (req, res, next) => {
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

    const groupObjectId = new mongoose.Types.ObjectId(groupId);

    // 1. Total spent & count
    const totalResult = await Expense.aggregate([
      { $match: { groupId: groupObjectId } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const totalSpent = totalResult.length > 0 ? totalResult[0].totalSpent : 0;
    const transactionCount = totalResult.length > 0 ? totalResult[0].transactionCount : 0;

    // 2. Spending by Category (Aggregation $group + $sort)
    const byCategory = await Expense.aggregate([
      { $match: { groupId: groupObjectId } },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalAmount: 1,
          count: 1,
        },
      },
    ]);

    // 3. Spending by Payer (Aggregation $group + $lookup + $unwind + $sort)
    const byPayer = await Expense.aggregate([
      { $match: { groupId: groupObjectId } },
      {
        $group: {
          _id: '$paidBy',
          totalPaid: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      { $sort: { totalPaid: -1 } },
      {
        $project: {
          _id: 1,
          totalPaid: 1,
          transactionCount: 1,
          'user._id': '$userInfo._id',
          'user.name': '$userInfo.name',
          'user.email': '$userInfo.email',
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSpent,
        transactionCount,
        byCategory,
        byPayer,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGroupBalances,
  getGroupSettleUp,
  recordSettlement,
  getGroupSummary,
};
