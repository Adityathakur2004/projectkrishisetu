const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true },
  images: [String],
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
  quality: {
    grade: { type: String, enum: ['A', 'B', 'C', 'D'] },
    organic: Boolean,
    pesticides: Boolean
  },
  harvestDate: Date,
  expiryDate: Date,
  bids: [{
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    date: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['active', 'sold', 'cancelled'], default: 'active' },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
