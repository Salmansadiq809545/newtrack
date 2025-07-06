const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection - Updated for your database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://tomandjerry8095:CfABQ2bA3H3Uvh4c@salman.zxcybpm.mongodb.net/hourlytracker?retryWrites=true&w=majority&appName=salman';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0
})
.then(() => {
  console.log("✅ MongoDB connected to 'hourlytracker' database");
})
.catch(err => {
  console.error("❌ MongoDB connection failed:", err);
  process.exit(1);
});

// ✅ Schema - Updated to match your frontend data structure
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
  timestamps: false
});

// Add index for better query performance
EntrySchema.index({ date: 1, userName: 1 });

// ✅ Model - This will create the 'entries' collection
const Entry = mongoose.model('Entry', EntrySchema);

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hourly Tracker API Running',
    status: 'OK',
    database: 'hourlytracker',
    collection: 'entries',
    memory: process.memoryUsage()
  });
});

// ✅ GET entries - Fixed to work with your frontend
app.get('/entries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const skip = parseInt(req.query.skip) || 0;
    
    const entries = await Entry.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    console.log(`✅ Retrieved ${entries.length} entries from database`);
    res.json(entries);
  } catch (err) {
    console.error('❌ Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// ✅ POST new entry - Fixed to match your frontend structure
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
    
    // Create new entry with data from frontend
    const newEntry = new Entry({
      userName: req.body.userName.trim(),
      qaName: req.body.qaName.trim(),
      annotationCount: parseInt(req.body.annotationCount),
      anticipatedCount: parseInt(req.body.anticipatedCount),
      timeSlot: req.body.timeSlot.trim(),
      location: req.body.location.trim(),
      date: req.body.date.trim(),
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
    });
    
    const savedEntry = await newEntry.save();
    
    console.log(`✅ Entry saved successfully:`, {
      id: savedEntry._id,
      userName: savedEntry.userName,
      date: savedEntry.date,
      timeSlot: savedEntry.timeSlot
    });
    
    res.json({ success: true, entry: savedEntry });
  } catch (err) {
    console.error('❌ Error saving entry:', err);
    res.status(500).json({ error: 'Failed to save entry', details: err.message });
  }
});

// ✅ DELETE all entries - Fixed to match your frontend
app.delete('/entries', async (req, res) => {
  try {
    const result = await Entry.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} entries from database`);
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
    console.error('❌ Error counting entries:', err);
    res.status(500).json({ error: 'Failed to count entries' });
  }
});

// ✅ GET entries by date (optional - useful for filtering)
app.get('/entries/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const entries = await Entry.find({ date }).sort({ timestamp: -1 }).lean();
    res.json(entries);
  } catch (err) {
    console.error('❌ Error fetching entries by date:', err);
    res.status(500).json({ error: 'Failed to fetch entries by date' });
  }
});

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
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
  console.log(`🔗 Database: hourlytracker`);
  console.log(`📋 Collection: entries`);
});