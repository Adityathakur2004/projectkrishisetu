const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/krishisetu')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));
// Note: removed deprecated mongoose options (useNewUrlParser, useUnifiedTopology).

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/transport', require('./routes/transport'));
app.use('/api/coldstorage', require('./routes/coldstorage'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/govt', require('./routes/govt'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/fpo', require('./routes/fpo'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('sendMessage', (data) => {
    io.to(data.receiverId).emit('receiveMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
