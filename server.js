import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
const DATA_FILE = path.join(__dirname, 'data', 'attendance.json');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Read records from file
const readRecords = async () => {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

// Write records to file
const writeRecords = async (records) => {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
};

// GET all records
app.get('/api/records', async (req, res) => {
  try {
    const records = await readRecords();
    res.json(records);
  } catch (error) {
    console.error('Error reading records:', error);
    res.status(500).json({ error: 'Failed to read records' });
  }
});

// POST new record
app.post('/api/records', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const records = await readRecords();
    const now = new Date();
    const timestamp = now.getTime();
    
    const newRecord = {
      userName: name.trim(),
      userId: name.trim().toLowerCase().replace(/\s+/g, '-'),
      loginDate: now.toLocaleDateString('en-IN'),
      loginTime: now.toLocaleTimeString('en-IN'),
      timestamp
    };

    records.push(newRecord);
    await writeRecords(records);

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// DELETE record by timestamp
app.delete('/api/records/:timestamp', async (req, res) => {
  try {
    const timestamp = parseInt(req.params.timestamp);
    
    if (isNaN(timestamp)) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }

    const records = await readRecords();
    const filteredRecords = records.filter(record => record.timestamp !== timestamp);
    
    if (records.length === filteredRecords.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await writeRecords(filteredRecords);
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📁 Data stored in: ${DATA_FILE}`);
  console.log(`🌐 Accessible from network on port ${PORT}`);
  console.log(`💡 To access from mobile devices, use your laptop's IP address: http://YOUR_IP:${PORT}`);
});

