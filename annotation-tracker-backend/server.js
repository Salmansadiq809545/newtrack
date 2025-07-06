// server.js - Memory Optimized Version
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ✅ Optimize Express settings for memory
app.use(express.json({ limit: '1mb' })); // Limit request size
app.use(cors({
  origin: ['http://localhost:3000', 'https://hourlytracker.onrender.com'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// ✅ MongoDB connection with memory optimization
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://tomandjerry8095:CfABQ2bA3H3Uvh4c@salman.zxcybpm.mongodb.net/annotation-tracker?retryWrites=true&w=majority&appName=salman';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 5, // Limit connection pool size
  serverSelectionTimeoutMS: 5000, // Timeout after 5s
  socketTimeoutMS: 45000, // Close sockets after 45s
  bufferMaxEntries: 0 // Disable mongoose buffering
})
.then(() => {
  console.log("✅ MongoDB connected");
})
.catch(err => {
  console.error("❌ MongoDB connection failed:", err);
  process.exit(1);
});

// ✅ Optimized Schema
const EntrySchema = new mongoose.Schema({
  userName: { type: String, required: true, maxlength: 50 },
  qaName: { type: String, required: true, maxlength: 10 },
  annotationCount: { type: Number, required: true, min: 0 },
  anticipatedCount: { type: Number, required: true, min: 0 },
  timeSlot: { type: String, required: true, maxlength: 10 },
  location: { type: String, required: true, maxlength: 20 },
  date: { type: String, required: true, maxlength: 10 },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false // Disable automatic timestamps to save memory
});

// Add index for better query performance
EntrySchema.index({ date: 1, userName: 1 });

const Entry = mongoose.model('Entry', EntrySchema);

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Running',
    status: 'OK',
    memory: process.memoryUsage()
  });
});

// ✅ GET entries with pagination to avoid memory issues
app.get('/entries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000; // Default limit
    const skip = parseInt(req.query.skip) || 0;
    
    const entries = await Entry.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean() for better performance
    
    res.json(entries);
  } catch (err) {
    console.error('❌ Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// ✅ POST new entry
app.post('/entries', async (req, res) => {
  try {
    const requiredFields = ['userName', 'qaName', 'annotationCount', 'anticipatedCount', 'timeSlot', 'location', 'date'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields 
      });
    }
    
    const newEntry = new Entry({
      userName: req.body.userName.trim(),
      qaName: req.body.qaName.trim(),
      annotationCount: parseInt(req.body.annotationCount),
      anticipatedCount: parseInt(req.body.anticipatedCount),
      timeSlot: req.body.timeSlot.trim(),
      location: req.body.location.trim(),
      date: req.body.date.trim()
    });
    
    const savedEntry = await newEntry.save();
    res.json({ success: true, entry: savedEntry });
  } catch (err) {
    console.error('❌ Error saving entry:', err);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// ✅ DELETE all entries
app.delete('/entries', async (req, res) => {
  try {
    const result = await Entry.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('❌ Error deleting entries:', err);
    res.status(500).json({ error: 'Failed to delete entries' });
  }
});

// ✅ GET entry count
app.get('/entries/count', async (req, res) => {
  try {
    const count = await Entry.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to count entries' });
  }
});

// ✅ Memory monitoring endpoint
app.get('/memory', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
    }
  });
});

// ✅ Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down gracefully');
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

// ✅ Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
});