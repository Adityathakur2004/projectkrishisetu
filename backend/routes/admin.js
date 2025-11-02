const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'buyer' }),
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Invoice.countDocuments(),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.json({
      totalUsers: stats[0],
      farmers: stats[1],
      buyers: stats[2],
      totalProducts: stats[3],
      activeProducts: stats[4],
      totalInvoices: stats[5],
      totalRevenue: stats[6][0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users
router.get('/users', auth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status } = req.query;

    let query = {};
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user status
router.put('/users/:id/status', auth, requireRole('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all products for moderation
router.get('/products', auth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    let query = {};
    if (status) query.status = status;

    const products = await Product.find(query)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Moderate product
router.put('/products/:id/moderate', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, reason } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        status,
        updatedAt: new Date(),
        moderationNote: reason
      },
      { new: true }
    ).populate('seller', 'name email');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product moderated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transaction reports
router.get('/transactions', auth, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    let query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await Invoice.find(query)
      .populate('seller', 'name email')
      .populate('buyer', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get analytics data
router.get('/analytics', auth, requireRole('admin'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Mock analytics data
    const analytics = {
      userGrowth: [
        { date: '2024-01', users: 120 },
        { date: '2024-02', users: 180 },
        { date: '2024-03', users: 250 }
      ],
      revenue: [
        { date: '2024-01', amount: 15000 },
        { date: '2024-02', amount: 22000 },
        { date: '2024-03', amount: 28000 }
      ],
      topProducts: [
        { name: 'Wheat', sales: 150 },
        { name: 'Rice', sales: 120 },
        { name: 'Cotton', sales: 90 }
      ],
      topLocations: [
        { location: 'Maharashtra', users: 200 },
        { location: 'Punjab', users: 150 },
        { location: 'Uttar Pradesh', users: 120 }
      ]
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send notification to users
router.post('/notifications', auth, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, targetUsers, type } = req.body;

    // In a real implementation, send notifications via email, SMS, push notifications
    // For now, simulate sending

    const notification = {
      id: 'NOTIF' + Date.now(),
      title,
      message,
      type: type || 'general',
      targetUsers: targetUsers || 'all',
      sentAt: new Date(),
      sentBy: req.user._id
    };

    res.json({
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get system settings
router.get('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
    // Mock settings
    const settings = {
      maintenance: false,
      registrationEnabled: true,
      emailNotifications: true,
      smsNotifications: false,
      commissionRate: 2.5,
      maxFileSize: 10, // MB
      supportedLanguages: ['en', 'hi', 'mr', 'bn']
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update system settings
router.put('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;

    // In a real implementation, update settings in database
    // For now, just return success

    res.json({
      message: 'Settings updated successfully',
      settings: updates
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reported content
router.get('/reports', auth, requireRole('admin'), async (req, res) => {
  try {
    // Mock reports
    const reports = [
      {
        id: 'REP001',
        type: 'product',
        contentId: 'PROD001',
        reason: 'Inappropriate content',
        reportedBy: 'USER001',
        status: 'pending',
        reportedAt: new Date()
      }
    ];

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Handle report
router.put('/reports/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { action, reason } = req.body;

    // In a real implementation, take action based on report
    // For now, simulate handling

    const report = {
      id: req.params.id,
      action,
      reason,
      handledBy: req.user._id,
      handledAt: new Date()
    };

    res.json({
      message: 'Report handled successfully',
      report
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
