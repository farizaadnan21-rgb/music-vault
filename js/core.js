/**
 * core.js — Core module for Music Vault
 * Handles configuration, logging, network stats, and audio visualizer
 */

// Global Configuration — Node ID unik per device (disimpan di localStorage)
(function() {
  let nodeId = localStorage.getItem('musshare_node_id');
  if (!nodeId) {
    // Generate ID unik: "Node-" + 2 digit angka (01-99)
    const num = Math.floor(Math.random() * 99) + 1;
    nodeId = 'Node-' + String(num).padStart(2, '0');
    localStorage.setItem('musshare_node_id', nodeId);
  }

  // Use relative path for API (same origin in Vercel)
  // In production, API is at same domain: /api/*
  window.AppConfig = {
    BACKEND_URL: '/api', // Relative path for Vercel
    NODE_ID: nodeId
  };

  // Update header title dengan Node ID device ini
  document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('node-title');
    if (titleEl) titleEl.textContent = nodeId + ': Music Vault';
  });
})();

const Logger = (() => {
  let logBody = null;

  const init = () => {
    logBody = document.getElementById('log-body');
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('id-ID');
  };

  const log = (type, message) => {
    if (!logBody) init();
    if (!logBody) return;

    const line = document.createElement('div');
    line.className = `log-line log-${type.toLowerCase()}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${formatTime()}]`;
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'log-type';
    typeSpan.textContent = `[${type}]`;
    
    const msgSpan = document.createElement('span');
    msgSpan.className = 'log-msg';
    msgSpan.textContent = message;
    
    line.appendChild(timeSpan);
    line.appendChild(typeSpan);
    line.appendChild(msgSpan);
    
    logBody.appendChild(line);
    logBody.scrollTop = logBody.scrollHeight;
  };

  const info = (msg) => log('INFO', msg);
  const warn = (msg) => log('WARN', msg);
  const error = (msg) => log('ERROR', msg);
  const success = (msg) => log('SUCCESS', msg);
  const clear = () => {
    if (logBody) logBody.innerHTML = '';
  };

  return { init, info, warn, error, success, clear, log };
})();

// Network Stats Module
const NetworkStats = (() => {
  const statsInterval = null;

  const init = () => {
    fetchStats();
    // Update stats every 5 seconds
    setInterval(fetchStats, 5000);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${window.AppConfig.BACKEND_URL}/stats`, {
        headers: { 'X-Node-Id': window.AppConfig.NODE_ID }
      });
      const data = await response.json();

      if (data.success && data.stats) {
        document.getElementById('stat-peers').textContent = data.stats.totalPeers;
        document.getElementById('stat-files').textContent = data.stats.totalFiles;
        document.getElementById('stat-latency').textContent = data.stats.avgLatency;
      }
    } catch (err) {
      Logger.warn('Gagal mengambil stats: ' + err.message);
    }
  };

  return { init, fetchStats };
})();

// Audio Visualizer Module
const AudioVisualizer = (() => {
  let audioContext = null;
  let analyser = null;
  let source = null;
  let canvas = null;
  let ctx = null;
  let isInitialized = false;

  const init = () => {
    canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
  };

  const connect = (audioElement) => {
    if (!canvas) init();
    if (!canvas || !audioElement) return;

    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (!source) {
        source = audioContext.createMediaElementSource(audioElement);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      }

      isInitialized = true;
      draw();
    } catch (err) {
      console.warn('Visualizer error:', err);
    }
  };

  const draw = () => {
    if (!isInitialized || !analyser || !ctx) return;

    requestAnimationFrame(draw);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2;
      
      const hue = (i / bufferLength) * 60 + 200;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  };

  return { init, connect };
})();

// Heartbeat Module - Keep connection alive
const Heartbeat = (() => {
  const init = () => {
    setInterval(sendHeartbeat, 10000); // Every 10 seconds
  };

  const sendHeartbeat = async () => {
    try {
      const start = Date.now();
      await fetch(`${window.AppConfig.BACKEND_URL}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-Id': window.AppConfig.NODE_ID
        },
        body: JSON.stringify({ latency: 0 })
      });
      const latency = Date.now() - start;
      
      // Update latency display
      const latencyEl = document.getElementById('stat-latency');
      if (latencyEl) latencyEl.textContent = latency + 'ms';
    } catch (err) {
      Logger.warn('Heartbeat gagal: ' + err.message);
    }
  };

  return { init };
})();

// Audio Player Module
const AudioPlayer = (() => {
  let audioElement = null;
  let isPlaying = false;

  const init = () => {
    audioElement = document.getElementById('audio-player');
    if (!audioElement) return;

    audioElement.addEventListener('play', () => {
      isPlaying = true;
      updatePlayerStatus('Playing');
      spinVinyl(true);
      AudioVisualizer.connect(audioElement);
    });

    audioElement.addEventListener('pause', () => {
      isPlaying = false;
      updatePlayerStatus('Paused');
      spinVinyl(false);
    });

    audioElement.addEventListener('ended', () => {
      isPlaying = false;
      updatePlayerStatus('Idle');
      spinVinyl(false);
    });
  };

  const play = async (filename, blobUrl) => {
    if (!audioElement) init();
    if (!audioElement) return;

    // Update track info
    document.getElementById('track-name').textContent = filename;
    document.getElementById('bar-track-name').textContent = filename;
    document.getElementById('track-source').textContent = 'Streaming...';
    document.getElementById('bar-track-node').textContent = 'Loading...';

    // Set audio source
    if (blobUrl) {
      audioElement.src = blobUrl;
    } else {
      audioElement.src = `${window.AppConfig.BACKEND_URL}/music/${encodeURIComponent(filename)}`;
    }

    try {
      await audioElement.play();
      Logger.success(`Now playing: ${filename}`);
    } catch (err) {
      Logger.error('Gagal memutar: ' + err.message);
    }
  };

  const updatePlayerStatus = (status) => {
    const statusEl = document.getElementById('player-status');
    if (statusEl) statusEl.textContent = status;
  };

  const spinVinyl = (spin) => {
    const vinyl = document.getElementById('album-art');
    if (vinyl) {
      vinyl.style.animation = spin ? 'spin 2s linear infinite' : 'none';
    }
  };

  return { init, play };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Logger.init();
  NetworkStats.init();
  AudioVisualizer.init();
  Heartbeat.init();
  AudioPlayer.init();
  
  Logger.info('Music Vault initialized');
  Logger.info(`Node ID: ${window.AppConfig.NODE_ID}`);
});
