const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  duration: { type: Number, required: true }, // in months
  interestRate: { type: Number, required: true },
  emi: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed', 'repaid'], default: 'applied' },
  documents: [{
    type: String,
    url: String,
    verified: Boolean
  }],
  eligibility: {
    score: Number,
    factors: [String],
    approved: Boolean
  },
  disbursedDate: Date,
  nextEmiDate: Date,
  payments: [{
    amount: Number,
    date: Date,
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' }
  }],
  bankDetails: {
    accountNumber: String,
    ifsc: String,
    bankName: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Loan', loanSchema);
