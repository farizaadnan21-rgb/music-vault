// Get playlist songs endpoint
const { playlists, fileIndex, log, updatePeerActivity } = require('../_store');

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
    const { playlistId } = req.query;

    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID required' });
    }

    updatePeerActivity(nodeId);

    // Check if playlist exists
    const playlist = playlists.get(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Get song details
    const songs = playlist.songs.map(filename => {
      const fileMeta = fileIndex.get(filename);
      return {
        filename,
        owner: fileMeta ? fileMeta.ownerId : 'Unknown',
        size: fileMeta ? fileMeta.size : 0,
        blobUrl: fileMeta ? fileMeta.blobUrl : null
      };
    });

    log('INFO', `Get songs for playlist ${playlistId}: ${songs.length} songs`);

    return res.status(200).json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        createdBy: playlist.createdBy,
        songs
      }
    });
  } catch (error) {
    log('ERROR', `Get playlist songs error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
