/**
 * playlist.js — Playlist Module
 * Allows users to create playlists and browse others' playlists.
 */

const Playlist = (() => {
  let playlistListEl, playlistEmptyEl, playlistCountEl;
  let createBtn, createNameInput;
  let viewingPlaylist = null;

  function init() {
    playlistListEl  = document.getElementById('playlist-list');
    playlistEmptyEl = document.getElementById('playlist-empty');
    playlistCountEl = document.getElementById('playlist-count');
    createBtn       = document.getElementById('playlist-create-btn');
    createNameInput = document.getElementById('playlist-name-input');

    createBtn.addEventListener('click', createPlaylist);
    createNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createPlaylist();
      }
    });

    fetchPlaylists();
    setInterval(fetchPlaylists, 8_000);
  }

  // ==================== LIST PLAYLISTS ====================

  async function fetchPlaylists() {
    if (viewingPlaylist) return;
    try {
      const res = await fetch(`${window.AppConfig.BACKEND_URL}/playlists`, {
        headers: { 'X-Node-Id': window.AppConfig.NODE_ID }
      });
      if (!res.ok) return;
      const data = await res.json();
      renderPlaylists(data.playlists || []);
    } catch (e) {
      // silent
    }
  }

  function renderPlaylists(playlists) {
    playlistCountEl.textContent = playlists.length + ' Playlist' + (playlists.length !== 1 ? 's' : '');

    if (playlists.length === 0) {
      playlistEmptyEl.style.display = 'block';
      const items = playlistListEl.querySelectorAll('.playlist-item');
      items.forEach(i => i.remove());
      return;
    }

    playlistEmptyEl.style.display = 'none';
    const myNode = window.AppConfig.NODE_ID;

    let html = '';
    playlists.forEach(pl => {
      const isMine = pl.createdBy === myNode;
      const ownerLabel = isMine ? `${pl.createdBy} (Anda)` : pl.createdBy;
      const bgColor = isMine ? '#E8F5E9' : '#EBF5FF';

      html += `
        <div class="playlist-item" style="background: ${bgColor};" onclick="Playlist.openPlaylist('${pl.id}')">
          <div class="playlist-item-icon">${isMine ? '📁' : '🎧'}</div>
          <div class="playlist-item-info">
            <div class="playlist-item-name">${Logger.escapeHTML(pl.name)}</div>
            <div class="playlist-item-meta">
              <span>${ownerLabel}</span>
              <span>•</span>
              <span>${pl.songCount} lagu</span>
            </div>
          </div>
          <div class="playlist-item-arrow">→</div>
        </div>
      `;
    });

    const items = playlistListEl.querySelectorAll('.playlist-item');
    items.forEach(i => i.remove());
    const detailView = playlistListEl.querySelector('.playlist-detail-view');
    if (detailView) detailView.remove();

    playlistListEl.insertAdjacentHTML('beforeend', html);
  }

  // ==================== CREATE PLAYLIST ====================

  async function createPlaylist() {
    const name = createNameInput.value.trim();
    if (!name) {
      Logger.append('Masukkan nama playlist.', 'warning');
      createNameInput.focus();
      return;
    }

    try {
      const res = await fetch(`${window.AppConfig.BACKEND_URL}/playlist/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-Id': window.AppConfig.NODE_ID
        },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        const data = await res.json();
        Logger.append(`Playlist "${name}" berhasil dibuat! (${data.playlist.id})`, 'success');
        createNameInput.value = '';
        fetchPlaylists();
      } else {
        Logger.append('Gagal membuat playlist.', 'error');
      }
    } catch (e) {
      Logger.append(`Error: ${e.message}`, 'error');
    }
  }

  // ==================== OPEN/VIEW PLAYLIST ====================

  async function openPlaylist(playlistId, isRefresh = false) {
    try {
      const res = await fetch(`${window.AppConfig.BACKEND_URL}/playlist/songs?playlistId=${playlistId}`, {
        headers: { 'X-Node-Id': window.AppConfig.NODE_ID }
      });
      if (!res.ok) {
        if (!isRefresh) Logger.append('Playlist tidak ditemukan.', 'error');
        return;
      }
      const data = await res.json();
      const pl = data.playlist;
      viewingPlaylist = pl;

      const myNode = window.AppConfig.NODE_ID;
      const isMine = pl.createdBy === myNode;

      if (!isRefresh) {
        if (!isMine) {
          Logger.append(`Memasuki playlist "${pl.name}" milik ${pl.createdBy}...`, 'info');
        } else {
          Logger.append(`Membuka playlist Anda: "${pl.name}"`, 'info');
        }
      }
      renderPlaylistDetail(pl, isMine);
    } catch (e) {
      if (!isRefresh) Logger.append(`Error: ${e.message}`, 'error');
    }
  }

  // Poll current playlist every 5 seconds
  setInterval(() => {
    if (viewingPlaylist) {
      openPlaylist(viewingPlaylist.id, true);
    }
  }, 5000);

  function renderPlaylistDetail(pl, isMine) {
    const titleEl = document.getElementById('node-title');

    if (!isMine) {
      titleEl.textContent = `🎧 Viewing ${pl.createdBy}'s Playlist`;
      titleEl.style.color = '#3A86FF';
    }

    const items = playlistListEl.querySelectorAll('.playlist-item');
    items.forEach(i => i.style.display = 'none');
    playlistEmptyEl.style.display = 'none';

    const oldDetail = playlistListEl.querySelector('.playlist-detail-view');
    if (oldDetail) oldDetail.remove();

    let songsHtml = '';
    if (pl.songs.length === 0) {
      songsHtml = `
        <div class="playlist-detail-empty">
          <div>🎵</div>
          <div>Playlist ini masih kosong</div>
        </div>
      `;
    } else {
      pl.songs.forEach((song, idx) => {
        const fullFile = Logger.escapeHTML(song.filename);
        const displayName = Logger.escapeHTML(song.originalName || song.filename);
        const hasBlobUrl = song.blobUrl && song.blobUrl !== 'null';
        songsHtml += `
          <div class="playlist-song-item">
            <span class="playlist-song-num">${idx + 1}</span>
            <span class="playlist-song-name">${displayName}</span>
            <div class="playlist-song-actions">
              ${hasBlobUrl ? `
                <button class="neo-btn-play-sm" onclick="Player.play('${fullFile}', '${Logger.escapeHTML(song.blobUrl || '')}')">▶</button>
              ` : '<span style="font-size:0.7rem;color:#999;">Tidak tersedia</span>'}
              ${isMine ? `
                <button class="playlist-song-remove" onclick="Playlist.removeSong('${pl.id}', '${fullFile}')" title="Hapus dari Playlist">✕</button>
              ` : ''}
            </div>
          </div>
        `;
      });
    }

    const addSongHtml = isMine ? `
      <div class="playlist-add-song">
        <input type="text" class="neo-input playlist-add-input" id="add-song-input-${pl.id}" list="available-songs-list" placeholder="Ketik nama file lagu..." autocomplete="off" />
        <datalist id="available-songs-list"></datalist>
        <button class="neo-btn neo-btn-sm neo-btn-primary" onclick="Playlist.addSong('${pl.id}')">+ Tambah</button>
      </div>
    ` : '';

    const detailHtml = `
      <div class="playlist-detail-view">
        <div class="playlist-detail-header">
          <button class="playlist-back-btn" onclick="Playlist.goBack()">← Kembali</button>
          <div class="playlist-detail-title">
            <strong>${Logger.escapeHTML(pl.name)}</strong>
            <span class="playlist-detail-owner">oleh ${Logger.escapeHTML(pl.createdBy)}${isMine ? ' <span class="badge" style="background:#FFD700;color:#000;">✨ YOU</span>' : ''} • ${pl.songs.length} lagu</span>
          </div>
          ${isMine ? `
            <button class="neo-btn neo-btn-danger neo-btn-sm" style="margin-left:auto;" onclick="Playlist.deletePlaylist('${pl.id}')">🗑️ Hapus Playlist</button>
          ` : ''}
        </div>
        ${addSongHtml}
        <div class="playlist-songs-list" id="playlist-songs-list-container">
          ${songsHtml}
        </div>
      </div>
    `;

    playlistListEl.insertAdjacentHTML('beforeend', detailHtml);

    if (isMine) {
      populateSongOptions();
    }
  }

  async function populateSongOptions() {
    try {
      const res = await fetch(`${window.AppConfig.BACKEND_URL}/list_files`, {
        headers: { 'X-Node-Id': window.AppConfig.NODE_ID }
      });
      if (res.ok) {
        const data = await res.json();
        const datalist = document.getElementById('available-songs-list');
        if (datalist && data.files) {
          datalist.innerHTML = data.files.map(f => `<option value="${Logger.escapeHTML(f.filename)}">${Logger.escapeHTML(f.originalName || f.filename)}</option>`).join('');
        }
      }
    } catch (e) {
      console.error('Failed to load songs for datalist:', e);
    }
  }

  // ==================== ADD / REMOVE SONGS ====================

  async function addSong(playlistId) {
    const input = document.getElementById(`add-song-input-${playlistId}`);
    const filename = input ? input.value.trim() : '';
    if (!filename) {
      Logger.append('Masukkan nama file lagu.', 'warning');
      return;
    }

    try {
      const res = await fetch(`${window.AppConfig.BACKEND_URL}/playlist/add_song`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-Id': window.AppConfig.NODE_ID
        },
        body: JSON.stringify({ playlistId, filename })
      });

      if (res.ok) {
        Logger.append(`"${filename}" ditambahkan ke playlist.`, 'success');
        input.value = '';
        openPlaylist(playlistId);
      }
    } catch (e) {
      Logger.append(`Error: ${e.message}`, 'error');
    }
  }

  async function removeSong(playlistId, filename) {
    try {
      const res = await fetch(`${window.AppConfig.BACKEND_URL}/playlist/remove_song`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-Id': window.AppConfig.NODE_ID
        },
        body: JSON.stringify({ playlistId, filename })
      });

      if (res.ok) {
        Logger.append(`"${filename}" dihapus dari playlist.`, 'warning');
        openPlaylist(playlistId);
      }
    } catch (e) {
      Logger.append(`Error: ${e.message}`, 'error');
    }
  }

  async function deletePlaylist(playlistId) {
    if (!confirm('Apakah Anda yakin ingin menghapus playlist ini selamanya?')) return;
    
    try {
      const res = await fetch(`${window.AppConfig.BACKEND_URL}/playlist/delete?playlistId=${playlistId}`, {
        method: 'DELETE',
        headers: {
          'X-Node-Id': window.AppConfig.NODE_ID
        }
      });

      if (res.ok) {
        Logger.append(`Playlist berhasil dihapus.`, 'warning');
        goBack();
      } else {
        Logger.append('Gagal menghapus playlist.', 'error');
      }
    } catch (e) {
      Logger.append(`Error: ${e.message}`, 'error');
    }
  }

  // ==================== GO BACK ====================

  function goBack() {
    viewingPlaylist = null;

    const titleEl = document.getElementById('node-title');
    titleEl.textContent = window.AppConfig.NODE_ID + ': Music Vault';
    titleEl.style.color = '';

    const detailView = playlistListEl.querySelector('.playlist-detail-view');
    if (detailView) detailView.remove();

    const items = playlistListEl.querySelectorAll('.playlist-item');
    items.forEach(i => i.style.display = '');

    Logger.append('Kembali ke daftar playlist.', 'info');
    fetchPlaylists();
  }

  return { init, openPlaylist, addSong, removeSong, deletePlaylist, goBack };
})();
