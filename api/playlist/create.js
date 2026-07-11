// Create playlist endpoint
const { playlists, getNextPlaylistId, log, updatePeerActivity } = require('../_store');

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
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name required' });
    }

    updatePeerActivity(nodeId);

    const playlistId = getNextPlaylistId();
    const playlist = {
      id: playlistId,
      name: name.trim(),
      songs: [],
      createdBy: nodeId,
      createdAt: new Date().toISOString()
    };

    playlists.set(playlistId, playlist);

    log('INFO', `Playlist created: ${playlistId} "${name}" by ${nodeId}`);

    return res.status(200).json({
      success: true,
      message: `Playlist "${name}" created successfully`,
      playlist
    });
  } catch (error) {
    log('ERROR', `Create playlist error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
