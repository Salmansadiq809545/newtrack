const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Middleware - Order matters!
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', req.body);
  }
  next();
});

// ✅ MongoDB Connection
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

// ✅ Schema
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

EntrySchema.index({ date: 1, userName: 1 });
const Entry = mongoose.model('Entry', EntrySchema);

// ✅ Root endpoint with more detailed info
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hourly Tracker API Running',
    status: 'OK',
    database: 'hourlytracker',
    collection: 'entries',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    routes: {
      'GET /': 'API status',
      'GET /entries': 'Get all entries',
      'POST /entries': 'Create new entry',
      'DELETE /entries': 'Delete all entries',
      'GET /entries/count': 'Get entry count',
      'GET /entries/:date': 'Get entries by date'
    }
  });
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ GET entries
app.get('/entries', async (req, res) => {
  try {
    console.log('📥 GET /entries - Fetching entries...');
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
    res.status(500).json({ 
      error: 'Failed to fetch entries', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ POST new entry - Enhanced error handling
app.post('/entries', async (req, res) => {
  try {
    console.log('📥 POST /entries - Creating new entry...');
    console.log('Request body:', req.body);
    
    // Validate request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('❌ Empty request body');
      return res.status(400).json({ 
        error: 'Request body is empty',
        timestamp: new Date().toISOString()
      });
    }
    
    const requiredFields = ['userName', 'qaName', 'annotationCount', 'anticipatedCount', 'timeSlot', 'location', 'date'];
    const missingFields = requiredFields.filter(field => !req.body[field] && req.body[field] !== 0);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields,
        receivedFields: Object.keys(req.body),
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate data types
    const annotationCount = parseInt(req.body.annotationCount);
    const anticipatedCount = parseInt(req.body.anticipatedCount);
    
    if (isNaN(annotationCount) || isNaN(anticipatedCount)) {
      console.log('❌ Invalid number values');
      return res.status(400).json({ 
        error: 'annotationCount and anticipatedCount must be valid numbers',
        timestamp: new Date().toISOString()
      });
    }
    
    // Create new entry
    const newEntry = new Entry({
      userName: req.body.userName.toString().trim(),
      qaName: req.body.qaName.toString().trim(),
      annotationCount: annotationCount,
      anticipatedCount: anticipatedCount,
      timeSlot: req.body.timeSlot.toString().trim(),
      location: req.body.location.toString().trim(),
      date: req.body.date.toString().trim(),
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
    });
    
    const savedEntry = await newEntry.save();
    
    console.log(`✅ Entry saved successfully:`, {
      id: savedEntry._id,
      userName: savedEntry.userName,
      date: savedEntry.date,
      timeSlot: savedEntry.timeSlot
    });
    
    res.json({ 
      success: true, 
      entry: savedEntry,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error saving entry:', err);
    res.status(500).json({ 
      error: 'Failed to save entry', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ DELETE all entries
app.delete('/entries', async (req, res) => {
  try {
    console.log('📥 DELETE /entries - Deleting all entries...');
    const result = await Entry.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} entries from database`);
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error deleting entries:', err);
    res.status(500).json({ 
      error: 'Failed to delete entries', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ GET entry count
app.get('/entries/count', async (req, res) => {
  try {
    const count = await Entry.countDocuments();
    res.json({ 
      count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error counting entries:', err);
    res.status(500).json({ 
      error: 'Failed to count entries', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ GET entries by date
app.get('/entries/:date', async (req, res) => {
  try {
    const { date } = req.params;
    console.log(`📥 GET /entries/${date} - Fetching entries by date...`);
    const entries = await Entry.find({ date }).sort({ timestamp: -1 }).lean();
    res.json(entries);
  } catch (err) {
    console.error('❌ Error fetching entries by date:', err);
    res.status(500).json({ 
      error: 'Failed to fetch entries by date', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: err.message,
    timestamp: new Date().toISOString()
  });
});

// ✅ Handle 404 routes - Return JSON instead of HTML
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /entries',
      'POST /entries',
      'DELETE /entries',
      'GET /entries/count',
      'GET /entries/:date'
    ]
  });
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
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Available routes:`);
  console.log(`   GET  /`);
  console.log(`   GET  /health`);
  console.log(`   GET  /entries`);
  console.log(`   POST /entries`);
  console.log(`   DELETE /entries`);
  console.log(`   GET  /entries/count`);
  console.log(`   GET  /entries/:date`);
});