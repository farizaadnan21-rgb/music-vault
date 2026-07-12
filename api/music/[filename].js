// Music streaming — redirect ke Blob URL langsung
// Vercel Blob handle HTTP 206 Partial Content natively
const { fileIndex, log, updatePeerActivity } = require('../_store');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const nodeId = req.headers['x-node-id'] || 'Unknown';
    const filename = req.query.filename;

    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    updatePeerActivity(nodeId);
    const fileMeta = fileIndex.get(filename);

    if (!fileMeta || !fileMeta.blobUrl) {
      return res.status(404).json({ error: 'File not found or not ready' });
    }

    // Redirect ke Blob URL — Blob handle 206 Range natively
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(302, { Location: fileMeta.blobUrl });
    res.end();
  } catch (error) {
    log('ERROR', `Music stream error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};