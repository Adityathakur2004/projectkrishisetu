const mongoose = require('mongoose');

const fpoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  founder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['member', 'admin', 'manager'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  crops: [String],
  totalLand: Number,
  certifications: [String],
  activities: [{
    type: String,
    description: String,
    date: Date,
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  finances: {
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    profit: { type: Number, default: 0 }
  },
  documents: [{
    type: String,
    url: String,
    verified: Boolean
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FPO', fpoSchema);
