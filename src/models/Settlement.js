const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer (from) user is required'],
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient (to) user is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Settlement amount is required'],
      min: [0.01, 'Settlement amount must be greater than 0'],
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'paid', // Transaksi pelunasan manual dicatat sebagai paid
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Settlement = mongoose.model('Settlement', settlementSchema);

module.exports = Settlement;
