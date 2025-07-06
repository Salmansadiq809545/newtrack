// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: 'https://hourlytracker.onrender.com/  // replace with your frontend's actual URL
}));
app.use(express.json());

mongoose.connect('mongodb+srv://tomandjerry8095:CfABQ2bA3H3Uvh4c@salman.zxcybpm.mongodb.net/?retryWrites=true&w=majority&appName=salman', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

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

// GET all entries
app.get('/entries', async (req, res) => {
  const entries = await Entry.find().sort({ timestamp: -1 });
  res.json(entries);
});

// POST a new entry
app.post('/entries', async (req, res) => {
  const newEntry = new Entry(req.body);
  await newEntry.save();
  res.json({ success: true, entry: newEntry });
});

// DELETE all entries (optional)
app.delete('/entries', async (req, res) => {
  await Entry.deleteMany({});
  res.json({ success: true });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
