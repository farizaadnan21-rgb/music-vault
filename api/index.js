const { put, del, head } = require('@vercel/blob');
const { handleUpload } = require('@vercel/blob/client');

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
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// --- API ENDPOINTS ---

app.get('/api/stats', (req, res) => {
  updatePeerActivity(req.headers['x-node-id'] || 'Unknown');
  cleanInactivePeers();
  let totalLatency = 0;
  for (const lat of peerLatency.values()) totalLatency += lat;
  const avgLatency = peerLatency.size > 0 ? Math.round(totalLatency / peerLatency.size) : 0;
  res.json({ success: true, stats: { totalFiles: fileIndex.size, totalPeers: activePeers.size, avgLatency: `${avgLatency}ms`, activePeers: Array.from(activePeers.keys()) } });
});

app.post('/api/heartbeat', (req, res) => {
  const nodeId = req.headers['x-node-id'] || 'Unknown';
  updatePeerActivity(nodeId, req.body.latency || 0);
  res.json({ success: true, message: 'Heartbeat received', nodeId });
});

app.get('/api/list_files', (req, res) => {
  updatePeerActivity(req.headers['x-node-id'] || 'Unknown');
  const files = [];
  for (const [filename, meta] of fileIndex) files.push({ filename, ...meta });
  res.json({ success: true, files, total: files.length });
});

app.get('/api/search', (req, res) => {
  updatePeerActivity(req.headers['x-node-id'] || 'Unknown');
  const q = (req.query.q || '').toLowerCase().trim();
  const results = [];
  for (const [filename, meta] of fileIndex) {
    if (!q || filename.toLowerCase().includes(q)) results.push({ filename, ...meta });
  }
  res.json({ success: true, query: q, results, totalPeers: activePeers.size });
});

app.delete('/api/delete_file', async (req, res) => {
  const nodeId = req.headers['x-node-id'] || 'Unknown';
  const filename = req.query.filename;
  if (!filename) return res.status(400).json({ error: 'Filename required' });
  
  const meta = fileIndex.get(filename);
  if (!meta) return res.status(404).json({ error: 'File not found' });
  if (meta.ownerId !== nodeId) return res.status(403).json({ error: 'Access denied' });
  
  if (process.env.BLOB_READ_WRITE_TOKEN && meta.blobUrl) {
    try { await del(meta.blobUrl); } catch (e) { log('WARN', e.message); }
  }
  fileIndex.delete(filename);
  res.json({ success: true, message: `Deleted ${filename}` });
});

// Vercel Blob token generator endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/webm'],
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let payload = {};
        try { payload = JSON.parse(tokenPayload); } catch(e){}
        fileIndex.set(blob.pathname, { ownerId: payload.nodeId || 'Unknown', size: payload.size || 0, blobUrl: blob.url, uploadedAt: new Date().toISOString() });
      }
    });
    res.json(jsonResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stream direct redirect
app.get('/api/music/:filename', (req, res) => {
  const meta = fileIndex.get(req.params.filename);
  if (!meta || !meta.blobUrl) return res.status(404).json({ error: 'Not found' });
  res.redirect(meta.blobUrl);
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

app.get('/api/playlist/songs', (req, res) => {
  const pl = playlists.get(req.query.playlistId);
  if (!pl) return res.status(404).json({ error: 'Not found' });
  const songs = pl.songs.map(filename => {
    const meta = fileIndex.get(filename);
    return { filename, owner: meta?.ownerId || 'Unknown', size: meta?.size || 0, blobUrl: meta?.blobUrl || null };
  });
  res.json({ success: true, playlist: { ...pl, songs } });
});

app.post('/api/playlist/add_song', (req, res) => {
  const { playlistId, filename } = req.body;
  const pl = playlists.get(playlistId);
  if (!pl || !fileIndex.has(filename)) return res.status(404).json({ error: 'Not found' });
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