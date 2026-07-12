const { put, del, head, list } = require('@vercel/blob');

// --- IN-MEMORY STORE ---
const fileIndex = new Map();
const activePeers = new Map();
const peerLatency = new Map();
const playlists = new Map();
let playlistIdCounter = 1;

const PEER_TIMEOUT_MS = 30000;

function log(level, message) {
  const timestamp = new Date().toLocaleString('id-ID');
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function updatePeerActivity(nodeId, latency = 0) {
  activePeers.set(nodeId, Date.now());
  if (latency > 0) peerLatency.set(nodeId, latency);
}

function cleanInactivePeers() {
  const now = Date.now();
  for (const [nodeId, lastSeen] of activePeers) {
    if (now - lastSeen > PEER_TIMEOUT_MS) {
      activePeers.delete(nodeId);
      peerLatency.delete(nodeId);
    }
  }
}

// --- EXPRESS APP SETUP ---
const express = require('express');
const app = express();

// JSON body parser — skip for /api/upload so the raw stream is preserved for Vercel Blob put()
app.use((req, res, next) => {
  if (req.url === '/api/upload' || req.url === '/upload') {
    return next();
  }
  express.json()(req, res, next);
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// --- API ENDPOINTS ---

app.get('/api/stats', async (req, res) => {
  updatePeerActivity(req.headers['x-node-id'] || 'Unknown');
  cleanInactivePeers();
  let totalLatency = 0;
  for (const lat of peerLatency.values()) totalLatency += lat;
  const avgLatency = peerLatency.size > 0 ? Math.round(totalLatency / peerLatency.size) : 0;
  
  let totalFiles = 0;
  try {
    const { blobs } = await list();
    totalFiles = blobs.length;
  } catch (e) {}
  
  res.json({ success: true, stats: { totalFiles, totalPeers: activePeers.size, avgLatency: `${avgLatency}ms`, activePeers: Array.from(activePeers.keys()) } });
});

app.post('/api/heartbeat', (req, res) => {
  const nodeId = req.headers['x-node-id'] || 'Unknown';
  updatePeerActivity(nodeId, req.body.latency || 0);
  res.json({ success: true, message: 'Heartbeat received', nodeId });
});

app.get('/api/list_files', async (req, res) => {
  updatePeerActivity(req.headers['x-node-id'] || 'Unknown');
  try {
    const { blobs } = await list();
    const files = blobs.map(b => {
      // Parse Node-ID from filename: "Node-45_song.mp3"
      const parts = b.pathname.split('_');
      const ownerId = parts.length > 1 ? parts[0] : 'Unknown';
      return { 
        filename: b.pathname, 
        ownerId, 
        size: b.size, 
        blobUrl: b.url, 
        uploadedAt: b.uploadedAt 
      };
    });
    res.json({ success: true, files, total: files.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/search', async (req, res) => {
  updatePeerActivity(req.headers['x-node-id'] || 'Unknown');
  const q = (req.query.q || '').toLowerCase().trim();
  
  try {
    const { blobs } = await list();
    const results = [];
    for (const b of blobs) {
      if (!q || b.pathname.toLowerCase().includes(q)) {
        const parts = b.pathname.split('_');
        const ownerId = parts.length > 1 ? parts[0] : 'Unknown';
        results.push({ 
          filename: b.pathname, 
          ownerId, 
          size: b.size, 
          blobUrl: b.url, 
          uploadedAt: b.uploadedAt 
        });
      }
    }
    res.json({ success: true, query: q, results, totalPeers: activePeers.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/delete_file', async (req, res) => {
  const nodeId = req.headers['x-node-id'] || 'Unknown';
  const filename = req.query.filename;
  const url = req.query.url;
  if (!filename || !url) return res.status(400).json({ error: 'Filename and url required' });
  
  const ownerId = filename.split('_')[0];
  if (ownerId !== nodeId && ownerId !== 'Unknown') return res.status(403).json({ error: 'Access denied' });
  
  try { 
    await del(url); 
    res.json({ success: true, message: `Deleted ${filename}` });
  } catch (e) { 
    log('WARN', e.message); 
    res.status(500).json({ error: e.message });
  }
});

// Server-side upload endpoint using put() — works with OIDC (no BLOB_READ_WRITE_TOKEN needed)
app.post('/api/upload', async (req, res) => {
  try {
    const filename = req.headers['x-filename'];
    const contentType = req.headers['content-type'] || 'audio/mpeg';
    if (!filename) return res.status(400).json({ error: 'X-Filename header required' });

    const blob = await put(filename, req, {
      access: 'public',
      contentType,
    });

    log('INFO', `Upload completed: ${blob.pathname}`);
    res.json({ success: true, url: blob.url, pathname: blob.pathname });
  } catch (err) {
    log('ERROR', `Upload failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Stream direct redirect
app.get('/api/music/:filename', async (req, res) => {
  try {
    const { blobs } = await list();
    const b = blobs.find(x => x.pathname === req.params.filename);
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.redirect(b.url);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Playlists
app.get('/api/playlists', (req, res) => {
  const list = [];
  for (const [id, pl] of playlists) list.push({ id: pl.id, name: pl.name, songCount: pl.songs.length, createdBy: pl.createdBy, createdAt: pl.createdAt });
  res.json({ success: true, playlists: list });
});

app.post('/api/playlist/create', (req, res) => {
  const name = req.body.name;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = `PL-${String(playlistIdCounter++).padStart(3, '0')}`;
  const pl = { id, name, songs: [], createdBy: req.headers['x-node-id'] || 'Unknown', createdAt: new Date().toISOString() };
  playlists.set(id, pl);
  res.json({ success: true, playlist: pl });
});

app.get('/api/playlist/songs', async (req, res) => {
  const pl = playlists.get(req.query.playlistId);
  if (!pl) return res.status(404).json({ error: 'Not found' });
  
  let blobsMap = new Map();
  try {
    const { blobs } = await list();
    blobs.forEach(b => blobsMap.set(b.pathname, b));
  } catch(e) {}
  
  const songs = pl.songs.map(filename => {
    const meta = blobsMap.get(filename);
    const ownerId = filename.split('_')[0];
    return { filename, owner: ownerId || 'Unknown', size: meta?.size || 0, blobUrl: meta?.url || null };
  });
  res.json({ success: true, playlist: { ...pl, songs } });
});

app.post('/api/playlist/add_song', (req, res) => {
  const { playlistId, filename } = req.body;
  const pl = playlists.get(playlistId);
  if (!pl) return res.status(404).json({ error: 'Not found' });
  
  if (!pl.songs.includes(filename)) pl.songs.push(filename);
  res.json({ success: true, playlist: pl });
});

app.post('/api/playlist/remove_song', (req, res) => {
  const { playlistId, filename } = req.body;
  const pl = playlists.get(playlistId);
  if (!pl) return res.status(404).json({ error: 'Not found' });
  pl.songs = pl.songs.filter(s => s !== filename);
  res.json({ success: true, playlist: pl });
});

module.exports = app;