const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all products with filters
router.get('/products', optionalAuth, async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      location,
      organic,
      grade,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { status: 'active' };

    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (location) query['location.city'] = new RegExp(location, 'i');
    if (organic) query['quality.organic'] = organic === 'true';
    if (grade) query['quality.grade'] = grade;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('seller', 'name profile.avatar ratings location')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

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

// Get single product
router.get('/products/:id', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email phone profile ratings location')
      .populate('bids.bidder', 'name profile.avatar');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment view count
    if (req.user && req.user._id.toString() !== product.seller._id.toString()) {
      product.views += 1;
      await product.save();
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create product
router.post('/products', auth, async (req, res) => {
  try {
    const productData = {
      ...req.body,
      seller: req.user._id
    };

    const product = new Product(productData);
    await product.save();

    await product.populate('seller', 'name profile.avatar ratings');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product
router.put('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('seller', 'name profile.avatar ratings');

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
router.delete('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Place bid
router.post('/products/:id/bid', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot bid on your own product' });
    }

    if (amount <= product.price) {
      return res.status(400).json({ message: 'Bid must be higher than current price' });
    }

    // Check if user already bid
    const existingBid = product.bids.find(bid =>
      bid.bidder.toString() === req.user._id.toString()
    );

    if (existingBid) {
      existingBid.amount = amount;
      existingBid.date = new Date();
    } else {
      product.bids.push({
        bidder: req.user._id,
        amount,
        date: new Date()
      });
    }

    await product.save();
    await product.populate('bids.bidder', 'name profile.avatar');

    res.json({
      message: 'Bid placed successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's products
router.get('/my-products', auth, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search products
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, location } = req.query;

    let query = { status: 'active' };

    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { category: new RegExp(q, 'i') }
      ];
    }

    if (category) query.category = category;
    if (location) query['location.city'] = new RegExp(location, 'i');

    const products = await Product.find(query)
      .populate('seller', 'name profile.avatar ratings')
      .limit(20)
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
