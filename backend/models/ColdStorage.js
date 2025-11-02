const mongoose = require('mongoose');

const coldStorageSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
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
  facilities: {
    totalCapacity: Number,
    availableCapacity: Number,
    temperature: Number,
    humidity: Number,
    ventilation: Boolean,
    monitoring: Boolean
  },
  services: [{
    name: String,
    description: String,
    price: Number,
    unit: String
  }],
  pricing: {
    baseRate: Number,
    perTonPerDay: Number,
    minimumPeriod: Number
  },
  bookings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    crop: String,
    quantity: Number,
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], default: 'pending' }
  }],
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  images: [String],
  documents: [{
    type: String,
    url: String,
    verified: Boolean
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ColdStorage', coldStorageSchema);
