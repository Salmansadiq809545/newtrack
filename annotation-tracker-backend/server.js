// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ✅ CORS: Allow frontend domain hosted on Render
app.use(cors({
  origin: ['http://localhost:3000', 'https://hourlytracker.onrender.com'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ✅ Connect to MongoDB with better error handling
const MONGODB_URI = 'mongodb+srv://tomandjerry8095:CfABQ2bA3H3Uvh4c@salman.zxcybpm.mongodb.net/annotation-tracker?retryWrites=true&w=majority&appName=salman';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("✅ MongoDB connected successfully");
  console.log("📊 Database name:", mongoose.connection.db.databaseName);
})
.catch(err => {
  console.error("❌ MongoDB connection failed:", err);
  process.exit(1);
});

// ✅ Monitor connection status
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected');
});

// ✅ Schema and model
const EntrySchema = new mongoose.Schema({
  userName: { type: String, required: true },
  qaName: { type: String, required: true },
  annotationCount: { type: Number, required: true },
  anticipatedCount: { type: Number, required: true },
  timeSlot: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

const Entry = mongoose.model('Entry', EntrySchema);

// ✅ Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Annotation Tracker API is running!',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// ✅ GET all entries with better error handling
app.get('/entries', async (req, res) => {
  try {
    console.log('📊 Fetching all entries...');
    const entries = await Entry.find().sort({ timestamp: -1 });
    console.log(`📊 Found ${entries.length} entries`);
    res.json(entries);
  } catch (err) {
    console.error('❌ Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries', details: err.message });
  }
});

// ✅ POST new entry with validation
app.post('/entries', async (req, res) => {
  try {
    console.log('📝 Creating new entry:', req.body);
    
    // Validate required fields
    const requiredFields = ['userName', 'qaName', 'annotationCount', 'anticipatedCount', 'timeSlot', 'location', 'date'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields 
      });
    }
    
    const newEntry = new Entry(req.body);
    const savedEntry = await newEntry.save();
    
    console.log('✅ Entry saved successfully:', savedEntry._id);
    res.json({ success: true, entry: savedEntry });
  } catch (err) {
    console.error('❌ Error saving entry:', err);
    res.status(500).json({ error: 'Failed to save entry', details: err.message });
  }
});

// ✅ DELETE all entries with confirmation
app.delete('/entries', async (req, res) => {
  try {
    console.log('🗑️ Deleting all entries...');
    const result = await Entry.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} entries`);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('❌ Error deleting entries:', err);
    res.status(500).json({ error: 'Failed to delete entries', details: err.message });
  }
});

// ✅ GET entries count (for debugging)
app.get('/entries/count', async (req, res) => {
  try {
    const count = await Entry.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('❌ Error counting entries:', err);
    res.status(500).json({ error: 'Failed to count entries' });
  }
});

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ✅ Start server (use dynamic port for Render)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📡 MongoDB connection closed');
    process.exit(0);
  });
});