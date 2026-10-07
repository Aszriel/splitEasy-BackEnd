const Group = require('../models/Group');
const User = require('../models/User');
const AppError = require('../utils/appError');

// Membuat grup baru
const createGroup = async (req, res, next) => {
  try {
    const { name } = req.body;

    const group = await Group.create({
      name,
      createdBy: req.user._id,
      members: [req.user._id], // Pembuat grup otomatis menjadi anggota pertama
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: {
        group: populatedGroup,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mendapatkan daftar grup yang diikuti oleh user yang sedang login
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        groups,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mendapatkan detail satu grup berdasarkan ID
const getGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return next(new AppError('Group not found', 404));
    }

    // Pastikan user yang meminta adalah anggota dari grup tersebut
    const isMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return next(new AppError('You are not a member of this group', 403));
    }

    res.status(200).json({
      success: true,
      data: {
        group,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Menambahkan anggota baru ke grup berdasarkan email
const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return next(new AppError('Group not found', 404));
    }

    // Pastikan user pemohon adalah anggota grup
    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new AppError('You are not authorized to add members to this group', 403));
    }

    // Cari user yang akan ditambahkan berdasarkan email
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return next(new AppError('User with this email does not exist', 404));
    }

    // Cek apakah user sudah terdaftar di grup
    const alreadyInGroup = group.members.some(
      (m) => m.toString() === userToAdd._id.toString()
    );
    if (alreadyInGroup) {
      return next(new AppError('User is already a member of this group', 400));
    }

    group.members.push(userToAdd._id);
    await group.save();

    const updatedGroup = await Group.findById(id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: {
        group: updatedGroup,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  addMember,
};
