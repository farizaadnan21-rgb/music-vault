// Add song to playlist endpoint
const { playlists, fileIndex, log, updatePeerActivity } = require('../_store');

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

    // Check if song exists in index
    if (!fileIndex.has(filename)) {
      return res.status(404).json({ error: 'Song not found in library' });
    }

    // Check if song already in playlist
    if (playlist.songs.includes(filename)) {
      return res.status(400).json({ error: 'Song already in playlist' });
    }

    // Add song to playlist
    playlist.songs.push(filename);

    log('INFO', `Song "${filename}" added to playlist ${playlistId} by ${nodeId}`);

    return res.status(200).json({
      success: true,
      message: `Song "${filename}" added to playlist`,
      playlist
    });
  } catch (error) {
    log('ERROR', `Add song error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
