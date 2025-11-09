const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-cafe', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Order = require('./models/Order');
const MenuItem = require('./models/MenuItem');
const Admin = require('./models/Admin');

app.use('/api/orders', require('./routes/orders'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/auth', require('./routes/auth'));

app.use('/customer', express.static(path.join(__dirname, '../customer-frontend/public')));
app.use('/admin', express.static(path.join(__dirname, '../owner-dashboard/public')));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>QR Cafe System</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #4F46E5; }
        a { display: block; padding: 15px; margin: 10px 0; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; text-align: center; }
        a:hover { background: #4338CA; }
      </style>
      </head>
      <body>
        <h1>QR Cafe Ordering System</h1>
        <p><a href="/customer?table=1">📱 Customer Ordering - Table 1</a></p>
        <p><a href="/customer?table=2">📱 Customer Ordering - Table 2</a></p>
        <p><a href="/customer?table=3">📱 Customer Ordering - Table 3</a></p>
        <p><a href="/admin">👑 Owner Dashboard</a></p>
        <p><em>Use table numbers 1, 2, 3 or any number for different tables</em></p>
      </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('join-admin', () => socket.join('admin-room'));
  socket.on('disconnect', () => console.log('Client disconnected'));
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Customer ordering: http://localhost:${PORT}/customer?table=1`);
  console.log(`👑 Owner dashboard: http://localhost:${PORT}/admin`);
  console.log(`🏠 Home page: http://localhost:${PORT}`);
});
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server running on port ${PORT}`);
// });
