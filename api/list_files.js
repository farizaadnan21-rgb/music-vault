// List all files endpoint
const { fileIndex, activePeers, log, updatePeerActivity } = require('./_store');

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
    updatePeerActivity(nodeId);

    const files = [];
    for (const [filename, meta] of fileIndex) {
      files.push({
        filename,
        owner: meta.ownerId,
        size: meta.size,
        blobUrl: meta.blobUrl,
        uploadedAt: meta.uploadedAt
      });
    }

    log('INFO', `List files requested by ${nodeId}: ${files.length} files`);

    return res.status(200).json({
      success: true,
      files,
      total: files.length
    });
  } catch (error) {
    log('ERROR', `List files error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
