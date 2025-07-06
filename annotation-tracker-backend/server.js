// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ✅ CORS: Allow frontend domain hosted on Render
app.use(cors({
  origin: 'https://hourlytracker.onrender.com'  // ✅ your frontend deployed URL
}));

app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect('mongodb+srv://tomandjerry8095:CfABQ2bA3H3Uvh4c@salman.zxcybpm.mongodb.net/annotation-tracker?retryWrites=true&w=majority&appName=salman', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection failed:", err));

// ✅ Schema and model
const EntrySchema = new mongoose.Schema({
  userName: String,
  qaName: String,
  annotationCount: Number,
  anticipatedCount: Number,
  timeSlot: String,
  location: String,
  date: String,
  timestamp: String
});

const Entry = mongoose.model('Entry', EntrySchema);

// ✅ GET all entries
app.get('/entries', async (req, res) => {
  try {
    const entries = await Entry.find().sort({ timestamp: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// ✅ POST new entry
app.post('/entries', async (req, res) => {
  try {
    const newEntry = new Entry(req.body);
    await newEntry.save();
    res.json({ success: true, entry: newEntry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// ✅ DELETE all entries
app.delete('/entries', async (req, res) => {
  try {
    await Entry.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entries' });
  }
});

// ✅ Start server (use dynamic port for Render)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
