const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: {
    type: { type: String, required: true },
    number: { type: String, required: true },
    capacity: { type: Number, required: true },
    features: [String]
  },
  routes: [{
    from: {
      city: String,
      state: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    to: {
      city: String,
      state: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    distance: Number,
    duration: Number
  }],
  pricing: {
    baseRate: Number,
    perKm: Number,
    perTon: Number
  },
  availability: {
    status: { type: String, enum: ['available', 'busy', 'maintenance'], default: 'available' },
    schedule: [{
      day: String,
      startTime: String,
      endTime: String
    }]
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  documents: [{
    type: String,
    url: String,
    verified: Boolean
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transport', transportSchema);
