// List all playlists endpoint
const { playlists, log, updatePeerActivity } = require('../_store');

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

    const playlistList = [];
    for (const [id, playlist] of playlists) {
      playlistList.push({
        id: playlist.id,
        name: playlist.name,
        songCount: playlist.songs.length,
        createdBy: playlist.createdBy,
        createdAt: playlist.createdAt
      });
    }

    log('INFO', `List playlists: ${playlistList.length} playlists`);

    return res.status(200).json({
      success: true,
      playlists: playlistList
    });
  } catch (error) {
    log('ERROR', `List playlists error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
