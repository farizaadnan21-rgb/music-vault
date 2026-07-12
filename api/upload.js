const { handleUpload } = require('@vercel/blob/client');
const { fileIndex, log } = require('./_store');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/webm'],
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let payload = {};
        try { payload = JSON.parse(tokenPayload); } catch(e){}
        
        fileIndex.set(blob.pathname, {
          ownerId: payload.nodeId || 'Unknown',
          size: payload.size || 0,
          blobUrl: blob.url,
          uploadedAt: new Date().toISOString()
        });
        log('INFO', `Client upload complete: ${blob.pathname}`);
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(jsonResponse);
  } catch (error) {
    log('ERROR', `Upload token error: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
};