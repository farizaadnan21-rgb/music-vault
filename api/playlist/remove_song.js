// Remove song from playlist endpoint
const { playlists, log, updatePeerActivity } = require('../_store');

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
    const { playlistId, filename } = req.body;

    if (!playlistId || !filename) {
      return res.status(400).json({ error: 'Playlist ID and filename required' });
    }

    updatePeerActivity(nodeId);

    // Check if playlist exists
    const playlist = playlists.get(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Remove song from playlist
    const index = playlist.songs.indexOf(filename);
    if (index === -1) {
      return res.status(404).json({ error: 'Song not found in playlist' });
    }

    playlist.songs.splice(index, 1);

    log('INFO', `Song "${filename}" removed from playlist ${playlistId} by ${nodeId}`);

    return res.status(200).json({
      success: true,
      message: `Song "${filename}" removed from playlist`,
      playlist
    });
  } catch (error) {
    log('ERROR', `Remove song error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
