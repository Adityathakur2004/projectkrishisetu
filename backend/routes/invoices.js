const express = require('express');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user's invoices
router.get('/my-invoices', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {
      $or: [
        { seller: req.user._id },
        { buyer: req.user._id }
      ]
    };

    if (status) query.status = status;

    const invoices = await Invoice.find(query)
      .populate('seller', 'name email')
      .populate('buyer', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('seller', 'name email phone location')
      .populate('buyer', 'name email phone location');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check if user is seller or buyer
    if (invoice.seller._id.toString() !== req.user._id.toString() &&
        invoice.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create invoice
router.post('/', auth, async (req, res) => {
  try {
    const { buyerId, items, dueDate, notes } = req.body;

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      item.total = item.quantity * item.price;
      subtotal += item.total;
    });

    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = 'INV' + Date.now();

    const invoice = new Invoice({
      invoiceNumber,
      seller: req.user._id,
      buyer: buyerId,
      items,
      subtotal,
      tax,
      total,
      dueDate,
      notes
    });

    await invoice.save();
    await invoice.populate('seller', 'name email location');
    await invoice.populate('buyer', 'name email location');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update invoice
router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot update paid invoice' });
    }

    const updates = req.body;

    // Recalculate totals if items changed
    if (updates.items) {
      let subtotal = 0;
      updates.items.forEach(item => {
        item.total = item.quantity * item.price;
        subtotal += item.total;
      });
      updates.subtotal = subtotal;
      updates.tax = subtotal * 0.18;
      updates.total = subtotal + updates.tax;
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).populate('seller', 'name email location')
     .populate('buyer', 'name email location');

    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark invoice as paid
router.put('/:id/pay', auth, async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Only buyer can mark as paid
    if (invoice.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    invoice.status = 'paid';
    invoice.paidDate = new Date();
    invoice.paymentMethod = paymentMethod;

    await invoice.save();

    res.json({
      message: 'Invoice marked as paid',
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate PDF (placeholder)
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check authorization
    if (invoice.seller._id.toString() !== req.user._id.toString() &&
        invoice.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // In a real implementation, generate PDF using puppeteer or pdfkit
    // For now, return invoice data
    res.json({
      message: 'PDF generation would happen here',
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get invoice statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      {
        $match: {
          $or: [
            { seller: req.user._id },
            { buyer: req.user._id }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'sent'] }, '$total', 0]
            }
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'sent'] },
                    { $lt: ['$dueDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueCount: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send invoice reminder
router.post('/:id/remind', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('buyer', 'email name');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Invoice already paid' });
    }

    // In a real implementation, send email reminder
    // For now, just return success
    res.json({
      message: 'Reminder sent successfully',
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
