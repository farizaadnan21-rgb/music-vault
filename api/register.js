// Register file endpoint
const { fileIndex, log, updatePeerActivity, corsHeaders } = require('./_store');

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const nodeId = req.headers['x-node-id'] || 'Unknown';
    const { filename, size } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    updatePeerActivity(nodeId);

    // Register file in index
    if (!fileIndex.has(filename)) {
      fileIndex.set(filename, {
        ownerId: nodeId,
        size: size || 0,
        blobUrl: null,
        uploadedAt: new Date().toISOString()
      });
    }

    log('INFO', `File registered: ${filename} by ${nodeId}`);

    return res.status(200).json({
      success: true,
      message: `File ${filename} registered successfully`,
      owner: nodeId
    });
  } catch (error) {
    log('ERROR', `Register error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
