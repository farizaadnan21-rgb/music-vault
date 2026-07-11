// In-memory storage (will be replaced with Vercel Blob in production)
const { v4: uuidv4 } = require('uuid');

// In-memory data stores (per-instance, resets on cold start)
// For production, use Vercel Blob or external database
const fileIndex = new Map(); // filename -> { ownerId, size, blobUrl, uploadedAt }
const activePeers = new Map(); // nodeId -> lastSeen
const peerLatency = new Map(); // nodeId -> latency
const playlists = new Map(); // playlistId -> { id, name, songs: [], createdBy }
let playlistIdCounter = 1;

// Peer timeout in milliseconds
const PEER_TIMEOUT_MS = 30000;

// Helper: Log messages
function log(level, message) {
  const timestamp = new Date().toLocaleString('id-ID');
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// Helper: Update peer activity
function updatePeerActivity(nodeId, latency = 0) {
  activePeers.set(nodeId, Date.now());
  if (latency > 0) {
    peerLatency.set(nodeId, latency);
  }
}

// Helper: Clean inactive peers
function cleanInactivePeers() {
  const now = Date.now();
  for (const [nodeId, lastSeen] of activePeers) {
    if (now - lastSeen > PEER_TIMEOUT_MS) {
      activePeers.delete(nodeId);
      peerLatency.delete(nodeId);
    }
  }
}

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Node-Id',
  };
}

// Export stores and helpers for other modules
module.exports = {
  fileIndex,
  activePeers,
  peerLatency,
  playlists,
  playlistIdCounter,
  log,
  updatePeerActivity,
  cleanInactivePeers,
  corsHeaders,
  uuidv4,
  PEER_TIMEOUT_MS,
  
  // Increment playlist counter
  getNextPlaylistId: () => {
    return `PL-${String(playlistIdCounter++).padStart(3, '0')}`;
  }
};
