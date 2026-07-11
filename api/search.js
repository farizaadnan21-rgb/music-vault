// Search files endpoint
const { fileIndex, activePeers, log, updatePeerActivity, corsHeaders } = require('./_store');

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const nodeId = req.headers['x-node-id'] || 'Unknown';
    const { q } = req.query;

    updatePeerActivity(nodeId);
    cleanInactivePeers();

    let results = [];

    if (q && q.trim()) {
      const searchTerm = q.toLowerCase().trim();
      
      for (const [filename, meta] of fileIndex) {
        if (filename.toLowerCase().includes(searchTerm)) {
          results.push({
            filename,
            owner: meta.ownerId,
            size: meta.size,
            blobUrl: meta.blobUrl
          });
        }
      }
    } else {
      // Return all files if no query
      for (const [filename, meta] of fileIndex) {
        results.push({
          filename,
          owner: meta.ownerId,
          size: meta.size,
          blobUrl: meta.blobUrl
        });
      }
    }

    log('INFO', `Search for "${q || 'all'}" by ${nodeId}: ${results.length} results`);

    return res.status(200).json({
      success: true,
      query: q || '',
      results,
      totalPeers: activePeers.size
    });
  } catch (error) {
    log('ERROR', `Search error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

function cleanInactivePeers() {
  const now = Date.now();
  for (const [nodeId, lastSeen] of activePeers) {
    if (now - lastSeen > 30000) {
      activePeers.delete(nodeId);
    }
  }
}
