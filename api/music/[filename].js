// Music streaming endpoint with HTTP 206 Partial Content support
const { head } = require('@vercel/blob');
const { fileIndex, log, updatePeerActivity } = require('../_store');

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const nodeId = req.headers['x-node-id'] || 'Unknown';
    const filename = req.query.filename ? decodeURIComponent(req.query.filename) : null;

    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    updatePeerActivity(nodeId);

    // Get file metadata
    const fileMeta = fileIndex.get(filename);
    if (!fileMeta) {
      log('WARN', `Music not found: ${filename}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const isLocal = !process.env.BLOB_READ_WRITE_TOKEN;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    if (isLocal) {
      // Local development - redirect to placeholder or return error
      // In production, Vercel Blob handles streaming automatically
      log('INFO', `Local mode: cannot stream ${filename}`);
      return res.status(501).json({ 
        error: 'Not available in local mode',
        message: 'Deploy to Vercel for audio streaming',
        filename 
      });
    }

    // Production - stream from Vercel Blob with range support
    const blobUrl = fileMeta.blobUrl;
    
    // Get blob metadata
    const blobInfo = await head(blobUrl);
    const fileSize = blobInfo.size;

    // Handle Range header for partial content
    const range = req.headers.range;

    if (range) {
      // Parse range header (e.g., "bytes=0-1023")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      log('INFO', `Streaming ${filename}: bytes ${start}-${end}/${fileSize}`);

      // Fetch the specific range from Blob
      const response = await fetch(blobUrl, {
        headers: { Range: `bytes=${start}-${end}` }
      });

      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', blobInfo.contentType || 'audio/mpeg');
      res.status(206);

      // Stream the response body
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      // No range - return full file info (or redirect)
      log('INFO', `Full file requested: ${filename}`);
      
      // Redirect to blob URL for full file
      res.setHeader('Content-Type', blobInfo.contentType || 'audio/mpeg');
      res.setHeader('Content-Length', fileSize);
      
      // Fetch and stream full file
      const response = await fetch(blobUrl);
      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    }
  } catch (error) {
    log('ERROR', `Music stream error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
