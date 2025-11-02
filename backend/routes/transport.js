const express = require('express');
const Transport = require('../models/Transport');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all transport services
router.get('/', async (req, res) => {
  try {
    const {
      from,
      to,
      vehicleType,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    if (from) query['routes.from.city'] = new RegExp(from, 'i');
    if (to) query['routes.to.city'] = new RegExp(to, 'i');
    if (vehicleType) query['vehicle.type'] = vehicleType;

    const transports = await Transport.find(query)
      .populate('provider', 'name phone profile ratings')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'ratings.average': -1 });

    const total = await Transport.countDocuments(query);

    res.json({
      transports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transport by ID
router.get('/:id', async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id)
      .populate('provider', 'name email phone profile ratings location');

    if (!transport) {
      return res.status(404).json({ message: 'Transport service not found' });
    }

    res.json(transport);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create transport service (transport providers only)
router.post('/', auth, requireRole('transport'), async (req, res) => {
  try {
    const transportData = {
      ...req.body,
      provider: req.user._id
    };

    const transport = new Transport(transportData);
    await transport.save();

    await transport.populate('provider', 'name profile.avatar ratings');

    res.status(201).json({
      message: 'Transport service created successfully',
      transport
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update transport service
router.put('/:id', auth, requireRole('transport'), async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id);

    if (!transport) {
      return res.status(404).json({ message: 'Transport service not found' });
    }

    if (transport.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedTransport = await Transport.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('provider', 'name profile.avatar ratings');

    res.json({
      message: 'Transport service updated successfully',
      transport: updatedTransport
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete transport service
router.delete('/:id', auth, requireRole('transport'), async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id);

    if (!transport) {
      return res.status(404).json({ message: 'Transport service not found' });
    }

    if (transport.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Transport.findByIdAndDelete(req.params.id);

    res.json({ message: 'Transport service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transport provider's services
router.get('/provider/my-services', auth, requireRole('transport'), async (req, res) => {
  try {
    const transports = await Transport.find({ provider: req.user._id })
      .sort({ createdAt: -1 });

    res.json(transports);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Book transport service
router.post('/:id/book', auth, async (req, res) => {
  try {
    const { pickupLocation, deliveryLocation, goods, weight, specialInstructions } = req.body;

    const transport = await Transport.findById(req.params.id);
    if (!transport) {
      return res.status(404).json({ message: 'Transport service not found' });
    }

    // Calculate estimated cost
    const distance = 100; // This should be calculated using Google Maps API
    const cost = transport.pricing.baseRate + (distance * transport.pricing.perKm) + (weight * transport.pricing.perTon);

    const booking = {
      user: req.user._id,
      pickupLocation,
      deliveryLocation,
      goods,
      weight,
      cost,
      specialInstructions,
      status: 'pending',
      createdAt: new Date()
    };

    // In a real app, you'd create a separate Booking model
    // For now, we'll just return the booking details

    res.json({
      message: 'Transport booking initiated',
      booking: {
        ...booking,
        transport: transport._id,
        estimatedCost: cost
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transport bookings for provider
router.get('/provider/bookings', auth, requireRole('transport'), async (req, res) => {
  try {
    // This would require a Booking model in a real implementation
    // For now, return empty array
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update transport availability
router.put('/:id/availability', auth, requireRole('transport'), async (req, res) => {
  try {
    const { status } = req.body;

    const transport = await Transport.findById(req.params.id);
    if (!transport) {
      return res.status(404).json({ message: 'Transport service not found' });
    }

    if (transport.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    transport.availability.status = status;
    await transport.save();

    res.json({
      message: 'Availability updated successfully',
      transport
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
