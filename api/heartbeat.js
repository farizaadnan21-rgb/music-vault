// Heartbeat endpoint for peer activity
const { activePeers, peerLatency, log, updatePeerActivity } = require('./_store');

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
    const { latency } = req.body;

    updatePeerActivity(nodeId, latency || 0);

    log('INFO', `Heartbeat from ${nodeId}, latency: ${latency || 0}ms`);

    return res.status(200).json({
      success: true,
      message: 'Heartbeat received',
      nodeId
    });
  } catch (error) {
    log('ERROR', `Heartbeat error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
