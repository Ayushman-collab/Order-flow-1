const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Create new order
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, tableNumber, items, total, notes } = req.body;
    
    const orderId = 'ORD-' + Date.now().toString().slice(-6);
    
    const order = new Order({
      orderId,
      customerName,
      customerPhone,
      tableNumber,
      items,
      total,
      notes
    });
    
    await order.save();
    
    const io = req.app.get('io');
    io.to('admin-room').emit('new-order', order);
    
    res.status(201).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get all orders (for admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const io = req.app.get('io');
    io.to('admin-room').emit('order-updated', order);
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;