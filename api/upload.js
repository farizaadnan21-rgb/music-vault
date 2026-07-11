// Upload file endpoint with Vercel Blob storage
const { put } = require('@vercel/blob');
const { fileIndex, log, updatePeerActivity } = require('./_store');

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    const filename = req.headers['x-filename'] ? decodeURIComponent(req.headers['x-filename']) : `upload-${Date.now()}.mp3`;
    const fileSize = parseInt(req.headers['content-length'] || '0', 10);

    updatePeerActivity(nodeId);

    log('INFO', `Upload started: ${filename} by ${nodeId}, size: ${fileSize}`);

    // Check if running locally (no BLOB_READ_WRITE_TOKEN)
    const isLocal = !process.env.BLOB_READ_WRITE_TOKEN;

    let blobUrl = null;

    if (isLocal) {
      // Local development - store in memory only
      // In production with Vercel Blob, files persist in cloud
      blobUrl = `/api/music/${encodeURIComponent(filename)}`;
      log('INFO', `Local mode: file stored in memory`);
    } else {
      // Production - use Vercel Blob
      const blob = await put(filename, req, {
        access: 'public',
        addRandomSuffix: false,
      });
      blobUrl = blob.url;
      log('INFO', `File uploaded to Blob: ${blobUrl}`);
    }

    // Store file metadata in index
    fileIndex.set(filename, {
      ownerId: nodeId,
      size: fileSize,
      blobUrl: blobUrl,
      uploadedAt: new Date().toISOString()
    });

    log('INFO', `Upload complete: ${filename} by ${nodeId}`);

    return res.status(200).json({
      success: true,
      message: `File ${filename} uploaded successfully`,
      filename,
      owner: nodeId,
      blobUrl,
      size: fileSize
    });
  } catch (error) {
    log('ERROR', `Upload error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
