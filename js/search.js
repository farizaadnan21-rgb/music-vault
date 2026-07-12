/**
 * search.js — Search & Results Table Module
 * Handles file search across Music Vault via API.
 */

const Search = (() => {
  let searchInput, resultsBody, resultsCount, emptyState;

  function init() {
    searchInput  = document.getElementById('search-input');
    resultsBody  = document.getElementById('results-body');
    resultsCount = document.getElementById('results-count');
    emptyState   = document.getElementById('empty-state');

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    });
  }

  function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      Logger.append('Error: Masukkan kata kunci untuk mencari.', 'error');
      searchInput.focus();
      return;
    }
    searchFiles(query);
  }

  function quickSearch(filename) {
    searchInput.value = filename;
    handleSearch();
  }

  async function searchFiles(keyword) {
    const esc = Logger.escapeHTML;
    Logger.append(`Mencari "${keyword}"...`, 'info');
    
    // Tampilkan loading animation
    resultsBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem;">
          <div style="font-size: 2rem; animation: spin 1s linear infinite; display: inline-block;">⏳</div>
          <div style="margin-top: 10px; color: #666;">Mencari file...</div>
        </td>
      </tr>
    `;
    emptyState.style.display = 'none';

    try {
      const response = await fetch(`${window.AppConfig.BACKEND_URL}/search?q=${encodeURIComponent(keyword)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      if (results.length > 0) {
        Logger.append(`Ditemukan ${results.length} file untuk "${keyword}".`, 'success');

        resultsBody.innerHTML = '';
        emptyState.style.display = 'none';
        resultsCount.textContent = `${results.length} Result${results.length > 1 ? 's' : ''}`;

        results.forEach((r, idx) => {
          const color = ['#3A86FF', '#FF6B9D', '#00E676', '#FF9F43', '#A855F7', '#FF3D57'][idx % 6];
          const row = document.createElement('tr');
          const sizeStr = r.size ? (r.size / (1024 * 1024)).toFixed(2) + ' MB' : '-';
          const isMine = r.ownerId === window.AppConfig.NODE_ID;
          
          row.innerHTML = `
            <td>
              <div class="file-info">
                <span class="file-icon">🎵</span>
                <div>
                  <div class="file-name" title="${esc(r.filename)}">${esc(r.originalName || r.filename)}</div>
                  <div class="file-size">${sizeStr}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="node-tag">
                <span class="node-dot" style="background:${color}"></span>
                ${esc(r.ownerId || 'Unknown')}
                ${isMine ? '<span class="badge" style="background:#FFD700;color:#000;margin-left:5px;">✨ YOU</span>' : ''}
              </span>
            </td>
            <td>${sizeStr}</td>
            <td>
              <div class="actions-cell">
                <button class="neo-btn neo-btn-stream" onclick="Player.play('${esc(r.filename)}', '${esc(r.blobUrl || '')}')">
                  ▶ Stream
                </button>
                ${isMine ? `
                  <button class="neo-btn neo-btn-danger neo-btn-sm" style="padding: 6px;" onclick="Upload.deleteServerFile('${esc(r.filename)}', '${esc(r.blobUrl || '')}')" title="Hapus File">🗑️</button>
                ` : ''}
              </div>
            </td>
          `;
          resultsBody.appendChild(row);
        });
      } else {
        Logger.append(`Tidak ditemukan hasil untuk "${keyword}".`, 'warning');
        resultsBody.innerHTML = '';
        emptyState.style.display = 'block';
        resultsCount.textContent = '0 Results';
        emptyState.querySelector('.empty-state-text').textContent = `"${keyword}" tidak ditemukan`;
        emptyState.querySelector('.empty-state-sub').textContent = 'Coba kata kunci lain (misal: "lagu", "remix", "podcast")';
      }
    } catch (error) {
      Logger.append(`Error gagal menghubungi server: ${error.message}`, 'error');
    }
  }

  return { init, handleSearch, quickSearch };
})();