const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  permissions: [{
    type: String,
    enum: ['manage_users', 'manage_products', 'manage_orders', 'view_analytics', 'manage_payments', 'manage_content']
  }],
  actions: [{
    type: String,
    description: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);
