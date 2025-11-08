const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ available: true });
    res.json({ success: true, menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;