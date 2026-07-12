// Upload file endpoint with Vercel Blob storage
const { put } = require('@vercel/blob');
const { fileIndex, log, updatePeerActivity } = require('./_store');

// Vercel: disable body parsing so we get raw stream for Blob upload
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Node-Id, X-Filename');
    return res.status(200).end();
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

    const isLocal = !process.env.BLOB_READ_WRITE_TOKEN;
    let blobUrl = null;

    if (isLocal) {
      blobUrl = `/api/music/${encodeURIComponent(filename)}`;
      log('INFO', `Local mode: file stored in memory`);
    } else {
      const blob = await put(filename, req, {
        access: 'public',
        addRandomSuffix: false,
      });
      blobUrl = blob.url;
      log('INFO', `File uploaded to Blob: ${blobUrl}`);
    }

    fileIndex.set(filename, {
      ownerId: nodeId,
      size: fileSize,
      blobUrl,
      uploadedAt: new Date().toISOString()
    });

    log('INFO', `Upload complete: ${filename} by ${nodeId}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
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

// Vercel config — disable body parsing for raw stream
module.exports.config = {
  api: { bodyParser: false }
};
