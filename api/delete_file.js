// Delete file endpoint
const { del } = require('@vercel/blob');
const { fileIndex, log, updatePeerActivity } = require('./_store');

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const nodeId = req.headers['x-node-id'] || 'Unknown';
    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    updatePeerActivity(nodeId);

    // Check if file exists
    const fileMeta = fileIndex.get(filename);
    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check ownership - only owner can delete
    if (fileMeta.ownerId !== nodeId) {
      log('WARN', `Delete denied: ${nodeId} tried to delete ${filename} (owner: ${fileMeta.ownerId})`);
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You can only delete your own files',
        owner: fileMeta.ownerId 
      });
    }

    // Delete from Vercel Blob (if in production)
    if (process.env.BLOB_READ_WRITE_TOKEN && fileMeta.blobUrl) {
      try {
        await del(fileMeta.blobUrl);
        log('INFO', `Deleted from Blob: ${fileMeta.blobUrl}`);
      } catch (blobError) {
        log('WARN', `Blob delete error: ${blobError.message}`);
        // Continue even if blob delete fails
      }
    }

    // Remove from index
    fileIndex.delete(filename);

    log('INFO', `File deleted: ${filename} by ${nodeId}`);

    return res.status(200).json({
      success: true,
      message: `File ${filename} deleted successfully`,
      filename
    });
  } catch (error) {
    log('ERROR', `Delete error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
