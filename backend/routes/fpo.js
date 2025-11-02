const express = require('express');
const FPO = require('../models/FPO');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all FPOs
router.get('/', async (req, res) => {
  try {
    const { city, state, crop, page = 1, limit = 10 } = req.query;

    let query = { isActive: true };

    if (city) query['location.city'] = new RegExp(city, 'i');
    if (state) query['location.state'] = new RegExp(state, 'i');
    if (crop) query.crops = crop;

    const fpos = await FPO.find(query)
      .populate('founder', 'name profile.avatar')
      .populate('members.user', 'name profile.avatar role')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await FPO.countDocuments(query);

    res.json({
      fpos,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get FPO by ID
router.get('/:id', async (req, res) => {
  try {
    const fpo = await FPO.findById(req.params.id)
      .populate('founder', 'name email phone profile ratings location')
      .populate('members.user', 'name profile.avatar role');

    if (!fpo) {
      return res.status(404).json({ message: 'FPO not found' });
    }

    res.json(fpo);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create FPO
router.post('/', auth, async (req, res) => {
  try {
    const fpoData = {
      ...req.body,
      founder: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin',
        joinedAt: new Date()
      }]
    };

    const fpo = new FPO(fpoData);
    await fpo.save();

    await fpo.populate('founder', 'name profile.avatar');
    await fpo.populate('members.user', 'name profile.avatar role');

    res.status(201).json({
      message: 'FPO created successfully',
      fpo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update FPO
router.put('/:id', auth, async (req, res) => {
  try {
    const fpo = await FPO.findById(req.params.id);

    if (!fpo) {
      return res.status(404).json({ message: 'FPO not found' });
    }

    // Check if user is admin of this FPO
    const isAdmin = fpo.members.some(member =>
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedFpo = await FPO.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('founder', 'name profile.avatar')
     .populate('members.user', 'name profile.avatar role');

    res.json({
      message: 'FPO updated successfully',
      fpo: updatedFpo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join FPO
router.post('/:id/join', auth, async (req, res) => {
  try {
    const fpo = await FPO.findById(req.params.id);

    if (!fpo) {
      return res.status(404).json({ message: 'FPO not found' });
    }

    // Check if user is already a member
    const isMember = fpo.members.some(member =>
      member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this FPO' });
    }

    fpo.members.push({
      user: req.user._id,
      role: 'member',
      joinedAt: new Date()
    });

    await fpo.save();
    await fpo.populate('members.user', 'name profile.avatar role');

    res.json({
      message: 'Successfully joined FPO',
      fpo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave FPO
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const fpo = await FPO.findById(req.params.id);

    if (!fpo) {
      return res.status(404).json({ message: 'FPO not found' });
    }

    const memberIndex = fpo.members.findIndex(member =>
      member.user.toString() === req.user._id.toString()
    );

    if (memberIndex === -1) {
      return res.status(400).json({ message: 'Not a member of this FPO' });
    }

    // Don't allow founder to leave
    if (fpo.founder.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Founder cannot leave the FPO' });
    }

    fpo.members.splice(memberIndex, 1);
    await fpo.save();

    res.json({ message: 'Successfully left FPO' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add activity to FPO
router.post('/:id/activities', auth, async (req, res) => {
  try {
    const { type, description, participants } = req.body;

    const fpo = await FPO.findById(req.params.id);

    if (!fpo) {
      return res.status(404).json({ message: 'FPO not found' });
    }

    // Check if user is member of this FPO
    const isMember = fpo.members.some(member =>
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    fpo.activities.push({
      type,
      description,
      date: new Date(),
      participants: participants || [req.user._id]
    });

    await fpo.save();

    res.json({
      message: 'Activity added successfully',
      activity: fpo.activities[fpo.activities.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get FPO activities
router.get('/:id/activities', auth, async (req, res) => {
  try {
    const fpo = await FPO.findById(req.params.id)
      .populate('activities.participants', 'name profile.avatar');

    if (!fpo) {
      return res.status(404).json({ message: 'FPO not found' });
    }

    // Check if user is member
    const isMember = fpo.members.some(member =>
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(fpo.activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update FPO finances
router.put('/:id/finances', auth, async (req, res) => {
  try {
    const { revenue, expenses } = req.body;

    const fpo = await FPO.findById(req.params.id);

    if (!fpo) {
      return res.status(404).json({ message: 'FPO not found' });
    }

    // Check if user is admin
    const isAdmin = fpo.members.some(member =>
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    fpo.finances.totalRevenue += revenue || 0;
    fpo.finances.totalExpenses += expenses || 0;
    fpo.finances.profit = fpo.finances.totalRevenue - fpo.finances.totalExpenses;

    await fpo.save();

    res.json({
      message: 'Finances updated successfully',
      finances: fpo.finances
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's FPOs
router.get('/user/my-fpos', auth, async (req, res) => {
  try {
    const fpos = await FPO.find({
      'members.user': req.user._id
    }).populate('founder', 'name profile.avatar');

    res.json(fpos);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search FPOs
router.get('/search/query', async (req, res) => {
  try {
    const { q } = req.query;

    const fpos = await FPO.find({
      isActive: true,
      $or: [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { crops: new RegExp(q, 'i') }
      ]
    })
    .populate('founder', 'name profile.avatar')
    .limit(10);

    res.json(fpos);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
