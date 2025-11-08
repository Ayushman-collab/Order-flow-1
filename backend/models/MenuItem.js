const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['coffee', 'tea', 'pastry', 'sandwich', 'breakfast', 'lunch', 'dinner']
  },
  image: {
    type: String,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    default: 10
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);