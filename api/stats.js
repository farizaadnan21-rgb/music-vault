// Network stats endpoint
const { fileIndex, activePeers, peerLatency, log, updatePeerActivity } = require('./_store');

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

    // Calculate average latency
    let totalLatency = 0;
    let latencyCount = 0;
    for (const [id, lat] of peerLatency) {
      totalLatency += lat;
      latencyCount++;
    }
    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    const stats = {
      totalFiles: fileIndex.size,
      totalPeers: activePeers.size,
      avgLatency: avgLatency > 0 ? `${avgLatency}ms` : '0ms',
      activePeers: Array.from(activePeers.keys())
    };

    log('INFO', `Stats requested by ${nodeId}`);

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    log('ERROR', `Stats error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
