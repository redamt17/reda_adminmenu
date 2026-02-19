(() => {
  'use strict';

  const resourceName = typeof GetParentResourceName === 'function'
    ? GetParentResourceName()
    : 'reda_adminmenu';

  const state = {
    visible: false,
    selectedPlayer: null,
    players: [],
    pendingAction: null,
    offlineMode: false,
    whiteMode: false,
    resources: [],
    offlinePlayers: [],
    offlineCharacters: [],
    offlineBans: [],
    offlineInventoryItems: [],
    offlineLicenseFilter: null,
    offlineSelectedCitizenid: null,
    offlineSelectedName: null,
    offlineSelectedLicense: null,
    brandTitle: '',
    brandBy: ''
  };

  const dom = {};

  function q(sel, root = document) {
    return root.querySelector(sel);
  }

  function qa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function cleanText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function ensureBranding() {
    const brandTitle = cleanText(state.brandTitle) || 'Admin Menu';
    const brandBy = cleanText(state.brandBy) || 'By: Admin';

    const logo = q('.logo');
    let titleEl = q('#brandTitle');
    if (!titleEl && logo) {
      const infoWrap = logo.children && logo.children[1];
      if (infoWrap) {
        titleEl = document.createElement('span');
        titleEl.id = 'brandTitle';
        titleEl.className = 'logo-text';
        infoWrap.prepend(titleEl);
      }
    }
    if (titleEl && titleEl.textContent !== brandTitle) titleEl.textContent = brandTitle;

    let byEl = q('#brandBy');
    if (!byEl && logo) {
      const infoWrap = logo.children && logo.children[1];
      if (infoWrap) {
        byEl = document.createElement('div');
        byEl.id = 'brandBy';
        byEl.className = 'logo-sub';
        infoWrap.appendChild(byEl);
      }
    }
    if (byEl && byEl.textContent !== brandBy) byEl.textContent = brandBy;

    const sidebarFooter = q('.sidebar-footer');
    let badgeEl = q('#brandBadge');
    if (!badgeEl && sidebarFooter) {
      badgeEl = document.createElement('div');
      badgeEl.id = 'brandBadge';
      badgeEl.className = 'rights-badge';
      sidebarFooter.prepend(badgeEl);
    }
    if (badgeEl) {
      const desired = `<strong>${brandTitle}</strong><br>${brandBy}`;
      if (badgeEl.innerHTML !== desired) {
        badgeEl.innerHTML = desired;
      }
    }
  }

  function nui(event, data = {}) {
    return fetch(`https://${resourceName}/${event}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data)
    })
      .then((res) => res.json())
      .catch(() => ({ ok: false, message: 'NUI request failed.' }));
  }

  function hasPerm(actionKey) {
    return nui('hasPerm', { actionKey })
      .then((data) => !!(data && data.allowed))
      .catch(() => false);
  }

  function showToastSafe(type, title, message) {
    if (typeof window.showToast === 'function') {
      window.showToast(type, title, message, { skipAction: true });
      return;
    }
    console.log(`[${type}] ${title}: ${message}`);
  }

  function setVisible(show) {
    state.visible = show;
    if (!dom.adminMenu) {
      dom.adminMenu = q('#adminMenu');
    }
    if (dom.adminMenu) {
      if (show) {
        dom.adminMenu.classList.remove('closing');
        dom.adminMenu.style.display = 'flex';
        dom.adminMenu.style.opacity = '0';
        dom.adminMenu.style.animation = 'fadeIn 0.3s ease-out forwards';
      } else {
        dom.adminMenu.classList.add('closing');
        setTimeout(() => {
          if (!state.visible) {
            dom.adminMenu.style.display = 'none';
          }
        }, 260);
      }
    }
    if (show) {
      refreshAll();
    }
  }

  function refreshAll() {
    loadMeta();
    if (state.offlineMode) {
      loadOfflinePlayers();
      loadOfflineCharacters();
      loadOfflineBans();
      return;
    }
    loadDashboard();
    loadPlayers();
    loadLogs();
    loadLocations();
    loadResources();
  }

  function loadMeta() {
    nui('getMeta').then((data) => {
      if (data && data.ok === false) {
        showToastSafe('error', 'Not authorized', data.message || 'Access denied.');
        nui('close');
        return;
      }
      if (!data) return;
      if (data.brandTitle) state.brandTitle = data.brandTitle;
      if (data.brandBy) state.brandBy = data.brandBy;
      ensureBranding();
      if (data.serverName && q('#serverName')) q('#serverName').textContent = data.serverName;
      if (data.adminName && q('#adminName')) q('#adminName').textContent = data.adminName;
      if (data.adminRole && q('#adminRoleDisplay')) q('#adminRoleDisplay').textContent = data.adminRole;
      const dutyStatus = q('#adminDutyStatus');
      const dutyBtn = q('#adminDutyBtn');
      if (dutyStatus && dutyBtn) {
        const onDuty = data.duty === true;
        dutyStatus.textContent = onDuty ? 'On Duty' : 'Off Duty';
        dutyStatus.style.color = onDuty ? 'var(--success)' : 'var(--text-muted)';
        dutyBtn.textContent = onDuty ? 'Go Off Duty' : 'Go On Duty';
        dutyBtn.classList.toggle('danger', onDuty);
      }
    });
  }

  function loadDashboard() {
    nui('getDashboard').then((data) => {
      if (!data) return;
      if (q('#onlinePlayers')) q('#onlinePlayers').textContent = data.onlinePlayers ?? 0;
      if (q('#activeStaff')) q('#activeStaff').textContent = data.activeStaff ?? 0;
      if (q('#totalPlayers')) q('#totalPlayers').textContent = data.totalPlayers ?? 0;
      if (q('#activeBans')) q('#activeBans').textContent = data.activeBans ?? 0;
    });
  }

  function resourceStateBadge(stateLabel) {
    const s = String(stateLabel || 'unknown').toLowerCase();
    if (s === 'started' || s === 'starting') return '<span class="status-badge online">Started</span>';
    if (s === 'stopped' || s === 'stopping') return '<span class="status-badge offline">Stopped</span>';
    return `<span class="status-badge">${stateLabel || 'Unknown'}</span>`;
  }

  function decodeResourceText(value) {
    let text = String(value || '');
    try {
      if (/%[0-9A-Fa-f]{2}/.test(text)) {
        text = decodeURIComponent(text);
      }
    } catch (e) {
      // keep original value
    }
    text = text.replace(/[\u200E\u200F]/g, '').trim();
    return text || '-';
  }

  function renderResources(resources) {
    const body = q('#resourceMonitorBody');
    if (!body) return;
    const search = (q('#resourceSearch')?.value || '').toLowerCase().trim();
    const filtered = (resources || []).filter((r) => {
      if (!search) return true;
      return `${r.name || ''} ${r.author || ''} ${r.state || ''}`.toLowerCase().includes(search);
    });

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No resources found</td></tr>';
      return;
    }

    body.innerHTML = filtered.map((r) => `
      <tr data-resource="${r.name || ''}">
        <td title="${decodeResourceText(r.name)}">${decodeResourceText(r.name)}</td>
        <td title="${decodeResourceText(r.author)}">${decodeResourceText(r.author)}</td>
        <td>${resourceStateBadge(r.state)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn success" title="Start Resource"><i class="fas fa-play"></i></button>
            <button class="action-btn" title="Restart Resource"><i class="fas fa-rotate-right"></i></button>
            <button class="action-btn danger" title="Stop Resource"><i class="fas fa-stop"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    qa('#resourceMonitorBody tr').forEach((row) => {
      const resName = row.dataset.resource || '';
      const buttons = row.querySelectorAll('button.action-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const title = btn.getAttribute('title') || '';
          if (title === 'Start Resource') {
            openModal('confirm', 'Start Resource', `Start resource ${resName}?`, { action: 'resourceStart', input: resName, resource: resName });
            return;
          }
          if (title === 'Restart Resource') {
            openModal('confirm', 'Restart Resource', `Restart resource ${resName}?`, { action: 'resourceRestart', input: resName, resource: resName });
            return;
          }
          if (title === 'Stop Resource') {
            openModal('confirm', 'Stop Resource', `Stop resource ${resName}?`, { action: 'resourceStop', input: resName, resource: resName });
          }
        });
      });
    });
  }

  function loadResources() {
    nui('getResources').then((data) => {
      const list = (data && data.resources) ? data.resources : [];
      state.resources = list;
      renderResources(list);
    });
  }

  function renderPlayers(players) {
    const body = q('#playerTableBody');
    if (!body) return;
    body.innerHTML = '';

    if (!players || !players.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px;">No players online</td></tr>';
      return;
    }

    players.forEach((p) => {
      const tr = document.createElement('tr');
      tr.dataset.playerId = String(p.id);
      tr.innerHTML = `
        <td>
          <div class="player-info">
            <div class="player-avatar">${String(p.name || 'P')[0].toUpperCase()}</div>
            <div>
              <div class="player-name">${p.name || 'Unknown'}</div>
              <div class="player-id">ID: ${p.id}</div>
            </div>
          </div>
        </td>
        <td>${p.job || '-'}</td>
        <td>${p.id}</td>
        <td>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${p.isStaff ? '<span class="status-badge online">Staff</span>' : '<span class="status-badge offline">Player</span>'}
            ${p.online ? '<span class="status-badge online">Online</span>' : '<span class="status-badge offline">Offline</span>'}
          </div>
        </td>
        <td>${p.ping ?? '-'}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
            <button class="action-btn" title="Teleport"><i class="fas fa-location-arrow"></i></button>
            <button class="action-btn warning" title="Warn"><i class="fas fa-exclamation-triangle"></i></button>
            <button class="action-btn danger" title="Kick"><i class="fas fa-right-from-bracket"></i></button>
            <button class="action-btn danger" title="Ban"><i class="fas fa-ban"></i></button>
          </div>
        </td>
      `;

      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selectPlayer(p);
        loadPlayerProfile(p.id);
      });

      const actionButtons = tr.querySelectorAll('button.action-btn');
      actionButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectPlayer(p);
          loadPlayerProfile(p.id);
          const title = btn.getAttribute('title') || '';
          handlePlayerRowAction(title);
        });
      });

      body.appendChild(tr);
    });

  }

  function selectPlayer(player) {
    state.selectedPlayer = player;
    qa('#playerTableBody tr').forEach((row) => {
      row.style.background = row.dataset.playerId === String(player.id) ? 'rgba(59, 130, 246, 0.12)' : '';
    });
  }

  function showPlayerListView() {
    const listView = q('#playerListView');
    const profileView = q('#playerProfileView');
    if (listView) listView.style.display = 'block';
    if (profileView) profileView.style.display = 'none';
  }

  function showPlayerProfileView() {
    const listView = q('#playerListView');
    const profileView = q('#playerProfileView');
    if (listView) listView.style.display = 'none';
    if (profileView) profileView.style.display = 'block';
  }

  function applyOfflineModeUI() {
    qa('.nav-item[data-online-nav="true"]').forEach((el) => {
      el.style.display = state.offlineMode ? 'none' : 'flex';
    });
    qa('.nav-item[data-offline-nav="true"]').forEach((el) => {
      el.style.display = state.offlineMode ? 'flex' : 'none';
    });
  }

  function setOfflineMode(enabled) {
    state.offlineMode = enabled === true;
    if (!state.offlineMode) {
      state.offlineLicenseFilter = null;
    }
    applyOfflineModeUI();
    if (typeof window.navigateTo === 'function') {
      window.navigateTo(state.offlineMode ? 'offlinePlayers' : 'dashboard');
    }
    refreshAll();
    showToastSafe('success', 'Mode', state.offlineMode ? 'Offline mode enabled.' : 'Offline mode disabled.');
  }

  function applyWhiteModeUI() {
    document.body.classList.toggle('white-mode', state.whiteMode === true);
  }

  function setWhiteMode(enabled) {
    state.whiteMode = enabled === true;
    applyWhiteModeUI();
    try {
      localStorage.setItem('reda_adminmenu_white_mode', state.whiteMode ? '1' : '0');
    } catch (e) {
      // ignore storage failures
    }
    showToastSafe('success', 'Theme', state.whiteMode ? 'White mode enabled.' : 'White mode disabled.');
  }

  function requireOfflineCharacterSelected() {
    if (!state.offlineSelectedCitizenid) {
      showToastSafe('warning', 'Select Character', 'Select an offline character first.');
      return false;
    }
    return true;
  }

  function getOfflineLicenseForBan() {
    const fromSelected = (state.offlineSelectedLicense || '').trim();
    if (fromSelected) return fromSelected;
    const fromFilter = (state.offlineLicenseFilter || '').trim();
    if (fromFilter) return fromFilter;
    return '';
  }

  function getOfflinePlayerNameByLicense(license) {
    const key = (license || '').trim();
    if (!key) return 'Unknown Player';
    const found = (state.offlinePlayers || []).find((p) => (p.license || '') === key);
    return (found && found.name) ? found.name : 'Unknown Player';
  }

  function getSelectedOfflinePlayerName() {
    return getOfflinePlayerNameByLicense(state.offlineSelectedLicense || '');
  }

  function handlePlayerRowAction(title) {
    if (!state.selectedPlayer) {
      showToastSafe('warning', 'Select Player', 'Please select a player first.');
      return;
    }
    if (title === 'View') {
      loadPlayerProfile(state.selectedPlayer.id);
      return;
    }
    if (title === 'Teleport') {
      doAction('goto', { target: state.selectedPlayer.id });
      return;
    }
    if (title === 'Warn') {
      openModal('input', 'Warn Player', 'Enter warning reason:', { action: 'warn', target: state.selectedPlayer.id });
      return;
    }
    if (title === 'Kick') {
      openModal('confirm', 'Kick Player', 'Are you sure you want to kick this player?', { action: 'kick', target: state.selectedPlayer.id });
      return;
    }
    if (title === 'Ban') {
      openModal('input', 'Ban Player', 'Enter ban reason and duration:', { action: 'ban', target: state.selectedPlayer.id });
    }
  }

  function loadPlayers() {
    nui('getPlayers').then((data) => {
      const list = (data && data.players) ? data.players : [];
      state.players = list;
      renderPlayers(list);
      if (state.selectedPlayer) {
        const found = list.find((p) => p.id === state.selectedPlayer.id);
        if (found) {
          selectPlayer(found);
          const profileView = q('#playerProfileView');
          if (profileView && profileView.style.display !== 'none') {
            loadPlayerProfile(found.id);
          }
        } else {
          showPlayerListView();
        }
      }
    });
  }

  function renderOfflinePlayers(players) {
    const body = q('#offlinePlayersTableBody');
    if (!body) return;
    const search = (q('#offlinePlayersSearch')?.value || '').toLowerCase().trim();
    const filtered = (players || []).filter((p) => {
      if (!search) return true;
      return `${p.name || ''} ${p.license || ''}`.toLowerCase().includes(search);
    });
    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No offline players found</td></tr>';
      return;
    }
    body.innerHTML = filtered.map((p) => `
      <tr data-license="${p.license || ''}">
        <td>${p.name || 'Unknown'}</td>
        <td>${p.license || '-'}</td>
        <td>${p.characters || 0}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn" title="View Characters"><i class="fas fa-id-card"></i></button>
            <button class="action-btn warning" title="Clear Inventory"><i class="fas fa-box-open"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    qa('#offlinePlayersTableBody tr').forEach((row) => {
      const license = row.dataset.license;
      const buttons = row.querySelectorAll('button.action-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const title = btn.getAttribute('title');
          if (title === 'View Characters') {
            state.offlineLicenseFilter = license;
            renderOfflineCharacters(state.offlineCharacters);
            if (typeof window.navigateTo === 'function') window.navigateTo('offlineCharacters');
            return;
          }
          if (title === 'Clear Inventory') {
            openModal('confirm', 'Clear Offline Inventories', 'Clear all character inventories for this license?', {
              action: 'clearOfflineByLicense',
              input: license
            });
          }
        });
      });
    });
  }

  function loadOfflinePlayers() {
    nui('getOfflinePlayers').then((data) => {
      const list = (data && data.players) ? data.players : [];
      state.offlinePlayers = list;
      renderOfflinePlayers(list);
    });
  }

  function renderOfflineCharacters(characters) {
    const body = q('#offlineCharactersTableBody');
    if (!body) return;
    const search = (q('#offlineCharactersSearch')?.value || '').toLowerCase().trim();
    const filtered = (characters || []).filter((c) => {
      const licenseMatch = !state.offlineLicenseFilter || c.license === state.offlineLicenseFilter;
      if (!licenseMatch) return false;
      if (!search) return true;
      return `${c.name || ''} ${c.citizenid || ''} ${c.license || ''}`.toLowerCase().includes(search);
    });
    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:16px;">No offline characters found</td></tr>';
      return;
    }
    body.innerHTML = filtered.map((c) => `
      <tr data-citizenid="${c.citizenid || ''}">
        <td>${c.name || 'Unknown'}</td>
        <td>${c.citizenid || '-'}</td>
        <td>${c.license || '-'}</td>
        <td>${c.job || '-'}</td>
        <td>${c.gang || '-'}</td>
        <td>${c.online ? '<span class="status-badge online">Online</span>' : '<span class="status-badge offline">Offline</span>'}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn" title="View Inventory"><i class="fas fa-box"></i></button>
            <button class="action-btn success" title="Give Item"><i class="fas fa-gift"></i></button>
            <button class="action-btn warning" title="Remove Item"><i class="fas fa-minus"></i></button>
            <button class="action-btn warning" title="Clear Inventory"><i class="fas fa-box-open"></i></button>
            <button class="action-btn danger" title="Delete Character"><i class="fas fa-user-slash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    qa('#offlineCharactersTableBody tr').forEach((row) => {
      const citizenid = row.dataset.citizenid;
      const name = row.children && row.children[0] ? row.children[0].textContent : citizenid;
      const license = row.children && row.children[2] ? row.children[2].textContent : '';
      const buttons = row.querySelectorAll('button.action-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const title = btn.getAttribute('title');
          if (title === 'View Inventory') {
            loadOfflineInventory(citizenid, name, license);
            return;
          }
          if (title === 'Give Item') {
            state.offlineSelectedCitizenid = citizenid;
            state.offlineSelectedName = name || citizenid;
            state.offlineSelectedLicense = license || state.offlineSelectedLicense;
            const playerName = getOfflinePlayerNameByLicense(license);
            openSelectInputModal(`Give Offline Item - ${playerName}`, 'Select item and amount:', {
              action: 'offlineGiveItem',
              citizenid
            }, 'items', 'Item', 'Amount', 'Enter amount');
            return;
          }
          if (title === 'Remove Item') {
            state.offlineSelectedCitizenid = citizenid;
            state.offlineSelectedName = name || citizenid;
            state.offlineSelectedLicense = license || state.offlineSelectedLicense;
            nui('getOfflineCharacterInventory', { citizenid }).then((data) => {
              renderOfflineInventory((data && data.items) ? data.items : []);
              if (!state.offlineInventoryItems || !state.offlineInventoryItems.length) {
                showToastSafe('warning', 'No Items', 'Selected character inventory is empty.');
                return;
              }
              const options = state.offlineInventoryItems
                .filter((item) => (Number(item.amount || 0) > 0))
                .map((item) => ({ value: item.name, label: `${item.label || item.name} (x${item.amount || 0})` }));
              if (!options.length) {
                showToastSafe('warning', 'No Items', 'No removable items found in inventory.');
                return;
              }
              setModalSelectOptions(options, 'Item');
              const inputLabelEl = q('#modalInputLabel');
              const inputEl = q('#modalInput');
              if (inputLabelEl) inputLabelEl.textContent = 'Amount';
              if (inputEl) inputEl.placeholder = 'Enter amount';
              const playerName = getOfflinePlayerNameByLicense(license);
              openModal('select_input', `Remove Offline Item - ${playerName}`, 'Select existing inventory item and amount:', {
                action: 'offlineRemoveItem',
                citizenid
              });
            });
            return;
          }
          if (title === 'Clear Inventory') {
            openModal('confirm', 'Clear Offline Inventory', 'Clear this character inventory?', {
              action: 'clearOfflineInventory',
              input: citizenid,
              citizenid
            });
            return;
          }
          if (title === 'Delete Character') {
            openModal('confirm', 'Delete Offline Character', 'Delete this character permanently?', {
              action: 'deleteOfflineCharacter',
              input: citizenid
            });
          }
        });
      });
    });
  }

  function loadOfflineCharacters() {
    nui('getOfflineCharacters').then((data) => {
      const list = (data && data.characters) ? data.characters : [];
      state.offlineCharacters = list;
      renderOfflineCharacters(list);
    });
  }

  function renderOfflineBans(bans) {
    const body = q('#offlineBansTableBody');
    if (!body) return;
    const prettyDate = (value) => {
      if (value === null || value === undefined || value === '') return '-';
      const asNum = Number(value);
      if (Number.isFinite(asNum) && asNum > 0) {
        const ms = asNum > 1e12 ? asNum : (asNum > 1e9 ? asNum * 1000 : asNum);
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return d.toLocaleString();
      }
      const d = new Date(String(value));
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
      return String(value);
    };
    const search = (q('#offlineBansSearch')?.value || '').toLowerCase().trim();
    const filtered = (bans || []).filter((b) => {
      if (!search) return true;
      return `${b.identifier || ''} ${b.reason || ''} ${b.admin || ''}`.toLowerCase().includes(search);
    });
    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;">No active bans found</td></tr>';
      return;
    }

    body.innerHTML = filtered.map((b) => `
      <tr data-license="${b.identifier || ''}">
        <td>${b.identifier || '-'}</td>
        <td>${b.reason || '-'}</td>
        <td>${b.admin || '-'}</td>
        <td>${prettyDate(b.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn" title="View Characters"><i class="fas fa-id-card"></i></button>
            <button class="action-btn danger" title="Unban License"><i class="fas fa-unlock"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    qa('#offlineBansTableBody tr').forEach((row) => {
      const license = row.dataset.license;
      const buttons = row.querySelectorAll('button.action-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!license) return;
          const title = btn.getAttribute('title');
          if (title === 'View Characters') {
            state.offlineLicenseFilter = license;
            renderOfflineCharacters(state.offlineCharacters);
            if (typeof window.navigateTo === 'function') window.navigateTo('offlineCharacters');
            return;
          }
          if (title === 'Unban License') {
            openModal('confirm', 'Unban License', 'Unban this license?', {
              action: 'offlineUnbanLicense',
              license,
              input: license
            });
          }
        });
      });
    });
  }

  function loadOfflineBans() {
    nui('getOfflineBans').then((data) => {
      const list = (data && data.bans) ? data.bans : [];
      state.offlineBans = list;
      renderOfflineBans(list);
    });
  }

  function renderOfflineInventory(items) {
    const list = q('#offlineInventoryList');
    state.offlineInventoryItems = Array.isArray(items) ? items : [];
    if (!list) return;
    if (!items || !items.length) {
      list.innerHTML = '<div class="empty-state" style="padding: 12px;"><i class="fas fa-box-open"></i><p>No items in inventory</p></div>';
      return;
    }
    list.innerHTML = items.map((item) => `
      <div class="item-card">
        <img class="item-img" src="${item.image || ''}" onerror="this.style.display='none'">
        <div class="item-name">${item.label || item.name}</div>
        <div class="item-count">x${item.amount || 0}</div>
        <button class="item-delete" data-item="${item.name}">Remove</button>
      </div>
    `).join('');

    qa('#offlineInventoryList .item-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        const itemName = btn.getAttribute('data-item') || '';
        if (!itemName) return;
        const itemObj = (state.offlineInventoryItems || []).find((i) => i.name === itemName);
        const label = (itemObj && (itemObj.label || itemObj.name)) || itemName;
        const amount = Number(itemObj && itemObj.amount ? itemObj.amount : 0);
        setModalSelectOptions([{ value: itemName, label: `${label} (x${amount})` }], 'Item');
        const inputLabelEl = q('#modalInputLabel');
        const inputEl = q('#modalInput');
        if (inputLabelEl) inputLabelEl.textContent = 'Amount';
        if (inputEl) inputEl.placeholder = 'Enter amount';
        const playerName = getSelectedOfflinePlayerName();
        openModal('select_input', `Remove Item - ${playerName}`, `Remove ${label} from selected character:`, {
          action: 'offlineRemoveItem',
          citizenid: state.offlineSelectedCitizenid
        });
      });
    });
  }

  function loadOfflineInventory(citizenid, name, license) {
    if (!citizenid) return;
    state.offlineSelectedCitizenid = citizenid;
    state.offlineSelectedName = name || citizenid;
    state.offlineSelectedLicense = license || state.offlineSelectedLicense;
    const title = q('#offlineInventoryTitle');
    if (title) {
      const playerName = getSelectedOfflinePlayerName();
      title.textContent = `Player: ${playerName} | Character: ${state.offlineSelectedName} (${citizenid})`;
    }
    nui('getOfflineCharacterInventory', { citizenid }).then((data) => {
      renderOfflineInventory((data && data.items) ? data.items : []);
    });
  }

  function renderLogs(logs) {
    const container = q('#logsContainer');
    if (!container) return;
    if (!logs || !logs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-scroll"></i>
          <p>No logs to display</p>
          <p style="font-size: 11px; margin-top: 8px;">Logs will appear here when actions are performed</p>
        </div>
      `;
      return;
    }
    container.innerHTML = logs.map((log) => `
      <div class="log-entry">
        <div class="log-timestamp">${log.time || '-'}</div>
        <div class="log-admin">${log.admin || '-'}</div>
        <div class="log-target">${log.target || '-'}</div>
        <div class="log-desc">${log.detail || '-'}</div>
        <div class="log-action ${log.action || ''}">${log.action || '-'}</div>
      </div>
    `).join('');
  }

  function loadLogs() {
    nui('getLogs').then((data) => {
      renderLogs((data && data.logs) ? data.logs : []);
    });
  }

  function renderLocations(locations) {
    const list = q('#locationList');
    if (!list) return;
    if (!locations || !locations.length) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-map-location-dot"></i>
          <p>No saved locations yet</p>
        </div>
      `;
      return;
    }
    list.innerHTML = locations.map((loc) => `
      <div class="location-item" data-location-id="${loc.id}">
        <div class="location-info">
          <div class="location-name">${loc.name}</div>
          <div class="location-coords">${loc.coords}</div>
        </div>
        <div class="location-actions">
          <button class="action-btn" title="Teleport"><i class="fas fa-location-arrow"></i></button>
        </div>
      </div>
    `).join('');

    qa('.location-item .action-btn', list).forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.location-item');
        const id = item ? item.dataset.locationId : null;
        if (id) {
          doAction('teleportSaved', { target: Number(id) });
        }
      });
    });
  }

  function loadLocations() {
    nui('getLocations').then((data) => {
      renderLocations((data && data.locations) ? data.locations : []);
    });
  }

  function openModal(type, title, message, pending) {
    state.pendingAction = pending || null;
    if (type === 'input') {
      const inputLabelEl = q('#modalInputLabel');
      const inputEl = q('#modalInput');
      if (inputLabelEl) inputLabelEl.textContent = 'Input';
      if (inputEl) inputEl.placeholder = 'Enter value...';
    }
    if (typeof window.showModal === 'function') {
      window.showModal(type, title, message, { skipAction: true });
    }
  }

  function setModalSelectOptions(options, label) {
    const select = q('#modalSelect');
    const selectLabel = q('#modalSelectLabel');
    if (!select) return;
    if (selectLabel && label) {
      selectLabel.textContent = label;
    }
    select.innerHTML = '';
    (options || []).forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });
  }

  function openSelectModal(title, message, pending, optionsKey, label) {
    nui('getOptions', { key: optionsKey }).then((data) => {
      setModalSelectOptions((data && data.options) ? data.options : [], label);
      openModal('select', title, message, pending);
    });
  }

  function openSelectInputModal(title, message, pending, optionsKey, selectLabel, inputLabel, inputPlaceholder) {
    nui('getOptions', { key: optionsKey }).then((data) => {
      setModalSelectOptions((data && data.options) ? data.options : [], selectLabel);
      const inputLabelEl = q('#modalInputLabel');
      const inputEl = q('#modalInput');
      if (inputLabelEl && inputLabel) inputLabelEl.textContent = inputLabel;
      if (inputEl && inputPlaceholder) inputEl.placeholder = inputPlaceholder;
      openModal('select_input', title, message, pending);
    });
  }

  function doAction(action, payload = {}) {
    return nui('action', { action, ...payload })
      .then((res) => {
        if (res && res.ok) {
          const silentActions = new Set(['copyCoords', 'copyHeading', 'copyVector2', 'copyVector3', 'copyVector4']);
          const isSilent = silentActions.has(action);
          const isDisableToggle = action === 'toggle' && payload && payload.state === false;
          if (!isSilent) {
            showToastSafe(isDisableToggle ? 'error' : 'success', 'Done', res.message || 'Action completed.');
            refreshAll();
          }
          if ((action === 'offlineGiveItem' || action === 'offlineRemoveItem' || action === 'clearOfflineInventory') && payload && payload.citizenid) {
            loadOfflineInventory(payload.citizenid, state.offlineSelectedName || payload.citizenid);
          }
        } else {
          showToastSafe('error', 'Error', (res && res.message) ? res.message : 'Action failed.');
        }
        return res;
      });
  }

  function getSelectedPlayerId() {
    return state.selectedPlayer ? state.selectedPlayer.id : null;
  }

  function getSelectedPlayerIdFromSelect() {
    return getSelectedPlayerId();
  }

  function loadPlayerProfile(playerId) {
    const card = q('#playerProfileCard');
    if (!card) return;
    nui('getPlayerProfile', { target: playerId }).then((data) => {
      if (!data || !data.profile) return;
      const profile = data.profile;
      q('#profileName').textContent = `${profile.name} - (${profile.id})`;
      q('#profileCharacter').textContent = profile.characterName || profile.name || 'N/A';
      q('#profileCitizen').textContent = profile.citizenid || 'N/A';
      q('#profileGender').textContent = profile.gender || 'N/A';
      q('#profileNationality').textContent = profile.nationality || 'N/A';
      q('#profileFood').textContent = profile.food || '0.00%';
      q('#profileWater').textContent = profile.water || '0.00%';
      q('#profilePhone').textContent = profile.phone || 'N/A';
      q('#profileCash').textContent = profile.cash || '$0';
      q('#profileBank').textContent = profile.bank || '$0';
      q('#profileJobDetails').textContent = profile.jobDetails || profile.job || '-';
      q('#profileGangDetails').textContent = profile.gangDetails || 'N/A';
      q('#profileRole').textContent = profile.role || 'user';
      const avatarImg = q('#profileAvatarImg');
      const avatarFallback = q('#profileAvatarFallback');
      if (avatarImg && avatarFallback) {
        const discordId = profile.discordId || '';
        const serverAvatarUrl = profile.avatarUrl || '';
        if (discordId || serverAvatarUrl) {
          const idx = Math.abs(parseInt(discordId, 10) || 0) % 5;
          const avatarSources = [];
          if (serverAvatarUrl) avatarSources.push(serverAvatarUrl);
          if (discordId) avatarSources.push(`https://unavatar.io/discord/${discordId}`);
          avatarSources.push(`https://cdn.discordapp.com/embed/avatars/${idx}.png`);
          let avatarIndex = 0;
          const tryLoadAvatar = () => {
            if (avatarIndex >= avatarSources.length) {
              avatarImg.style.display = 'none';
              avatarFallback.style.display = 'block';
              return;
            }
            avatarImg.src = avatarSources[avatarIndex++];
          };
          avatarImg.onload = () => {
            avatarImg.style.display = 'block';
            avatarFallback.style.display = 'none';
          };
          avatarImg.onerror = () => {
            tryLoadAvatar();
          };
          tryLoadAvatar();
        } else {
          avatarImg.style.display = 'none';
          avatarFallback.style.display = 'block';
        }
      }
      showPlayerProfileView();
      loadPlayerInventory(playerId);
      loadPlayerVehicles(playerId);
    });
  }

  function renderInventory(items) {
    const container = q('#inventoryList');
    if (!container) return;
    if (!items || !items.length) {
      container.innerHTML = '<div class="empty-state" style="padding: 12px;"><i class="fas fa-box-open"></i><p>No items</p></div>';
      return;
    }
    container.innerHTML = items.map((item) => `
      <div class="item-card" data-item="${item.name}">
        <img class="item-img" src="${item.image}" onerror="this.style.display='none'">
        <div class="item-name">${item.label}</div>
        <div class="item-count">x${item.amount}</div>
        <button class="item-delete" data-item="${item.name}">Delete</button>
      </div>
    `).join('');

    qa('.item-delete', container).forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-item');
        const target = getSelectedPlayerId();
        if (!target) return;
        doAction('removeItem', { target, item: name });
        setTimeout(() => loadPlayerInventory(target), 300);
      });
    });
  }

  function loadPlayerInventory(playerId) {
    nui('getPlayerInventory', { target: playerId }).then((data) => {
      renderInventory((data && data.items) ? data.items : []);
    });
  }

  function renderVehicles(vehicles) {
    const container = q('#vehicleList');
    if (!container) return;
    if (!vehicles || !vehicles.length) {
      container.innerHTML = '<div class="empty-state" style="padding: 12px;"><i class="fas fa-car-side"></i><p>No vehicles</p></div>';
      return;
    }
    container.innerHTML = vehicles.map((veh) => `
      <div class="vehicle-card">
        <div>
          <div class="vehicle-title">${veh.name || veh.model || 'Vehicle'}</div>
          <div class="vehicle-meta">Plate: ${veh.plate || '-'}</div>
        </div>
        <button class="vehicle-spawn" data-model="${veh.model || ''}" data-plate="${veh.plate || ''}">Spawn</button>
      </div>
    `).join('');

    qa('.vehicle-spawn', container).forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = getSelectedPlayerId();
        if (!target) return;
        const model = btn.getAttribute('data-model') || '';
        const plate = btn.getAttribute('data-plate') || '';
        doAction('spawnOwnedVehicle', { target, model, plate });
      });
    });
  }

  function loadPlayerVehicles(playerId) {
    nui('getPlayerVehicles', { target: playerId }).then((data) => {
      renderVehicles((data && data.vehicles) ? data.vehicles : []);
    });
  }

  function bindButton(sectionId, label, handler) {
    const section = q(`#${sectionId}`);
    if (!section) return;
    const wanted = cleanText(label).toLowerCase();
    const buttons = qa('button', section);
    let button = buttons.find((btn) => cleanText(btn.textContent).toLowerCase() === wanted);
    if (!button) {
      button = buttons.find((btn) => cleanText(btn.textContent).toLowerCase().includes(wanted));
    }
    if (!button) return;
    button.removeAttribute('onclick');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handler(button);
    });
    return button;
  }

  function bindSectionButtons() {
    bindButton('dashboard', 'Announce', () => {
      openModal('input', 'Announcement', 'Enter announcement message:', { action: 'announce' });
    });
    bindButton('dashboard', 'TP to Marker', () => doAction('tpMarker'));
    bindButton('dashboard', 'Clear Area', () => openModal('confirm', 'Clear Area', 'Delete all vehicles in the area?', { action: 'clearArea' }));
    bindButton('dashboard', 'Copy Coords', () => doAction('copyCoords'));

    const dashboardCommands = q('#dashboardAdminCommands');
    if (dashboardCommands) {
      qa('button', dashboardCommands).forEach((btn) => {
        const key = btn.getAttribute('data-self');
        const action = btn.getAttribute('data-action');
        btn.addEventListener('click', () => {
          if (action === 'adminCar') return doAction('adminCar');
          if (action === 'checkPerms') {
            return openModal('input', 'Check Perms', 'Enter player ID:', { action: 'checkPerms' });
          }
          if (key === 'noclip') {
            const next = !btn.classList.contains('active');
            btn.classList.toggle('active', next);
            return doAction('toggle', { input: 'No Clip', state: next, permKey: 'noclip' });
          }
          if (key === 'god') {
            const next = !btn.classList.contains('active');
            btn.classList.toggle('active', next);
            return doAction('toggle', { input: 'God Mode', state: next, permKey: 'godMode' });
          }
          if (key === 'invisible') {
            const next = !btn.classList.contains('active');
            btn.classList.toggle('active', next);
            return doAction('toggle', { input: 'Invisible', state: next, permKey: 'invisible' });
          }
          if (key === 'ammo') {
            const next = !btn.classList.contains('active');
            btn.classList.toggle('active', next);
            return doAction('toggle', { input: 'Infinite Ammo', state: next, permKey: 'infiniteAmmo' });
          }
          if (key === 'tpMarker') return doAction('tpMarker');
          if (key === 'copyCoords') return doAction('copyCoords');
          if (key === 'fixVehicle') return doAction('fixVehicle');
          if (key === 'deleteVehicle') return doAction('deleteVehicle');
          if (key === 'flipVehicle') return doAction('flipVehicle');
          if (key === 'fullHeal') return doAction('selfHeal');
          if (key === 'fullArmor') return doAction('fullArmor');
          if (key === 'revive') return doAction('selfRevive');
        });
      });
    }

    bindButton('vehicles', 'Spawn Vehicle', () => {
      const model = (q('#vehicleModelInput') || {}).value || '';
      const plate = (q('#vehiclePlateInput') || {}).value || '';
      const rawTarget = ((q('#vehicleTargetIdInput') || {}).value || '').trim();
      if (rawTarget !== '') {
        const target = parseInt(rawTarget, 10);
        if (!target) {
          showToastSafe('warning', 'Player ID', 'Enter a valid player ID.');
          return;
        }
        doAction('giveVehicle', {
          target,
          input: String(model).trim(),
          plate: String(plate).trim()
        });
        return;
      }
      doAction('spawnVehicle', {
        input: {
          model: String(model).trim(),
          plate: String(plate).trim()
        }
      });
    });
    bindButton('vehicles', 'Give to Player', () => {
      const model = (q('#vehicleModelInput') || {}).value || '';
      const plate = (q('#vehiclePlateInput') || {}).value || '';
      const target = parseInt((q('#vehicleTargetIdInput') || {}).value || '0', 10);
      if (!target) {
        showToastSafe('warning', 'Player ID', 'Enter a valid player ID.');
        return;
      }
      doAction('giveVehicle', {
        target,
        input: String(model).trim(),
        plate: String(plate).trim()
      });
    });
    bindButton('vehicles', 'Delete Vehicle', () => doAction('deleteVehicle'));
    bindButton('vehicles', 'Fix Vehicle', () => doAction('fixVehicle'));
    bindButton('vehicles', 'Refuel Vehicle', () => doAction('refuelVehicle'));
    bindButton('vehicles', 'Change Plate', () => openModal('input', 'Change Plate', 'Enter new plate:', { action: 'changePlate' }));
    bindButton('vehicles', 'Max Mods', () => doAction('maxMods'));
    bindButton('vehicles', 'Sit in Vehicle', () => doAction('sitInVehicle'));
    bindButton('vehicles', 'Car Wipe', () => openModal('confirm', 'Car Wipe', 'Delete abandoned vehicles in 30 seconds?', { action: 'carWipe' }));
    bindButton('vehicles', 'Toggle Laser', () => doAction('toggleLaser'));
    bindButton('vehicles', 'Copy Heading', () => doAction('copyHeading'));
    bindButton('vehicles', 'Copy Vector2', () => doAction('copyVector2'));
    bindButton('vehicles', 'Copy Vector3', () => doAction('copyVector3'));
    bindButton('vehicles', 'Copy Vector4', () => doAction('copyVector4'));

    bindButton('teleport', 'Teleport', () => {
      const inputs = qa('#teleport .input-row input');
      const coords = {
        x: parseFloat(inputs[0]?.value || 0),
        y: parseFloat(inputs[1]?.value || 0),
        z: parseFloat(inputs[2]?.value || 0),
        h: parseFloat(inputs[3]?.value || 0)
      };
      doAction('teleportCoords', { coords });
    });
    bindButton('teleport', 'Copy Current', () => doAction('copyCoords'));
    bindButton('teleport', 'TP to Marker', () => doAction('tpMarker'));
    bindButton('teleport', 'TP Back', () => doAction('tpBack'));
    bindButton('teleport', 'TP to Waypoint', () => doAction('tpMarker'));
    bindButton('teleport', 'Save Current', () => {
      const name = (q('#teleport input[placeholder=\"Location name\"]') || {}).value || 'Location';
      doAction('saveLocation', { input: name });
    });

    bindButton('economy', 'Give Item', () => openModal('input', 'Give Item', 'Enter item name and amount:', { action: 'giveItem' }));
    bindButton('economy', 'Give Item to All', () => openModal('input', 'Give All', 'Enter item name and amount:', { action: 'giveAllItems' }));
    bindButton('economy', 'Open Inventory', () => {
      const target = getSelectedPlayerIdFromSelect();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('openInventory', { target });
    });
    bindButton('economy', 'Open Stash', () => openModal('input', 'Open Stash', 'Enter stash ID:', { action: 'openStash' }));
    bindButton('economy', 'Open Trunk', () => openModal('input', 'Open Trunk', 'Enter plate:', { action: 'openTrunk' }));
    bindButton('economy', 'Clear Inventory', () => openModal('confirm', 'Clear Inventory', 'Clear player inventory?', { action: 'clearInventory' }));
    bindButton('economy', 'Clear Inv Offline', () => openModal('input', 'Clear Offline', 'Enter player identifier:', { action: 'clearOffline' }));
    bindButton('economy', 'Give Money', () => {
      const amount = Number(q('#economy input[type=\"number\"]')?.value || 0);
      const type = q('#economy select')?.value || 'Cash';
      const target = getSelectedPlayerIdFromSelect();
      if (!target) {
        showToastSafe('warning', 'Select Player', 'Select a player first.');
        return;
      }
      doAction(type === 'Bank' ? 'giveBank' : 'giveCash', { amount, playerId: target, target });
    });
    bindButton('economy', 'Give to All', () => openModal('confirm', 'Give All', 'Give money to all players?', { action: 'giveAllMoney' }));
    bindButton('economy', 'Remove Money', () => {
      const amount = Number(q('#economy input[type=\"number\"]')?.value || 0);
      const target = getSelectedPlayerIdFromSelect();
      if (!target) {
        showToastSafe('warning', 'Select Player', 'Select a player first.');
        return;
      }
      doAction('removeMoney', { amount, playerId: target, target });
    });
    bindButton('economy', 'Remove Stress', () => {
      const target = getSelectedPlayerIdFromSelect();
      doAction('removeStress', target ? { target } : {});
    });
    bindButton('economy', 'Set Ammo', () => openModal('input', 'Set Ammo', 'Enter ammo amount:', { action: 'setAmmo' }));
    bindButton('economy', 'Full Heal', () => {
      const target = getSelectedPlayerIdFromSelect();
      doAction('fullHeal', target ? { target } : {});
    });
    bindButton('economy', 'Feed Player', () => {
      const target = getSelectedPlayerIdFromSelect();
      doAction('feedPlayer', target ? { target } : {});
    });

    bindButton('world', 'Apply Time', () => {
      const value = q('#timeSlider')?.value || '0';
      doAction('setTime', { input: `${value}:00` });
    });

    const weatherButtons = qa('#world .btn-grid .grid-btn');
    const weathers = {
      Clear: 'CLEAR',
      Cloudy: 'CLOUDS',
      Overcast: 'OVERCAST',
      Rain: 'RAIN',
      Thunder: 'THUNDER',
      Snow: 'SNOW',
      Fog: 'FOGGY',
      Xmas: 'XMAS'
    };
    weatherButtons.forEach((btn) => {
      const label = cleanText(btn.textContent);
      if (weathers[label]) {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', () => doAction('setWeather', { input: weathers[label] }));
      }
    });

    bindButton('world', 'Toggle Blackout', () => doAction('blackout'));
    bindButton('world', 'Toggle Traffic', () => doAction('toggleTraffic'));
    bindButton('world', 'Toggle Peds', () => doAction('togglePeds'));

    bindButton('devtools', 'Copy Coords', () => doAction('copyCoords'));
    bindButton('devtools', 'Give NUI Focus', () => doAction('giveNuiFocus'));
    const runCmdBtn = bindButton('devtools', 'Run Command', () => openModal('input', 'Run Command', 'Enter command:', { action: 'runCommand' }));
    bindButton('devtools', 'Print to Console', () => doAction('printConsole'));

    bindButton('players', 'Ban Player', () => openModal('input', 'Ban Player', 'Select player and enter reason:', { action: 'ban' }));
    bindButton('players', 'Kick Player', () => openModal('input', 'Kick Player', 'Select player and enter reason:', { action: 'kick' }));
    bindButton('players', 'Warn Player', () => openModal('input', 'Warn Player', 'Select player and enter reason:', { action: 'warn' }));
    bindButton('players', 'Message Player', () => openModal('input', 'Message Player', 'Enter message:', { action: 'message' }));
    const muteBtn = bindButton('players', 'Mute Player', () => {
      const target = getSelectedPlayerIdFromSelect();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('mutePlayer', { target });
    });
    bindButton('players', 'Freeze Player', () => {
      const target = getSelectedPlayerIdFromSelect();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('freezePlayer', { target });
    });
    const spectateBtn = bindButton('players', 'Spectate Player', () => {
      const target = getSelectedPlayerIdFromSelect();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('spectatePlayer', { target });
    });
    bindButton('players', 'Bring Player', () => {
      const target = getSelectedPlayerIdFromSelect();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('bring', { target });
    });
    bindButton('players', 'TP to Player', () => {
      const target = getSelectedPlayerId();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('goto', { target });
    });
    bindButton('players', 'Teleport Back', () => doAction('tpBack'));
    bindButton('players', 'Kill Player', () => openModal('confirm', 'Kill Player', 'Are you sure?', { action: 'killPlayer' }));
    bindButton('players', 'Revive Player', () => {
      const target = getSelectedPlayerId();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('revivePlayer', { target });
    });
    bindButton('players', 'Revive Radius', () => openModal('input', 'Revive Radius', 'Enter radius (meters):', { action: 'reviveRadius' }));
    bindButton('players', 'Revive All', () => openModal('confirm', 'Revive All', 'Revive all players?', { action: 'reviveAll' }));
    bindButton('players', 'Explode Player', () => openModal('confirm', 'Explode', 'Are you sure?', { action: 'explodePlayer' }));
    bindButton('players', 'Make Drunk', () => {
      const target = getSelectedPlayerId();
      if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
      doAction('makeDrunk', { target });
    });
    bindButton('players', 'Set Player Ped', () => openModal('input', 'Set Ped', 'Enter ped model:', { action: 'setPed' }));
    bindButton('players', 'Set Job', () => openSelectInputModal('Set Job', 'Select job and grade:', { action: 'setJob' }, 'jobs', 'Job', 'Grade', 'Enter grade (number)'));
    bindButton('players', 'Set Gang', () => openSelectInputModal('Set Gang', 'Select gang and grade:', { action: 'setGang' }, 'gangs', 'Gang', 'Grade', 'Enter grade (number)'));
    bindButton('players', 'Set Permissions', () => openSelectModal('Permissions', 'Set permission level:', { action: 'setPermissions' }, 'perms', 'Permission'));
    bindButton('players', 'Set Bucket', () => openModal('input', 'Set Bucket', 'Enter bucket ID:', { action: 'setBucket' }));

    if (runCmdBtn) {
      hasPerm('runCommand').then((allowed) => {
        if (!allowed) runCmdBtn.style.display = 'none';
      });
    }
    if (muteBtn) {
      hasPerm('mutePlayer').then((allowed) => {
        if (!allowed) muteBtn.style.display = 'none';
      });
    }
    if (spectateBtn) {
      hasPerm('spectatePlayer').then((allowed) => {
        if (!allowed) spectateBtn.style.display = 'none';
      });
    }

    const togglePermMap = {
      'Toggle Duty': 'toggleDuty',
      'Toggle Cuffs': 'toggleCuffs',
      'Toggle Names': 'toggleNames',
      'Toggle Blips': 'toggleBlips',
      'Toggle Coords': 'toggleCoords',
      'Invisible': 'invisible',
      'God Mode': 'godMode',
      'Infinite Ammo': 'infiniteAmmo',
      'No Clip': 'noclip'
    };

    const toggles = qa('#players .btn-grid .grid-btn');
    toggles.forEach((btn) => {
      const label = cleanText(btn.textContent);
      const toggleNames = ['Toggle Duty', 'Toggle Cuffs', 'Toggle Names', 'Toggle Blips', 'Toggle Coords', 'Invisible', 'God Mode', 'Infinite Ammo', 'No Clip'];
      if (toggleNames.includes(label)) {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', () => {
          const active = btn.classList.toggle('active');
          doAction('toggle', { input: label, state: active, permKey: togglePermMap[label] || 'toggle' });
        });
      }
    });
  }

  function resolveTarget(payload) {
    if (payload.target) return payload.target;
    const selected = getSelectedPlayerIdFromSelect();
    return selected || null;
  }

  function executePending(inputValue, selectValue) {
    const pending = state.pendingAction;
    state.pendingAction = null;
    if (!pending || !pending.action) return;

    const action = pending.action;
    let target = pending.target;
    if (!target) target = resolveTarget(pending);

    const payload = {
      target,
      input: (inputValue || pending.input || ''),
      mode: pending.mode,
      select: selectValue,
      citizenid: pending.citizenid || null,
      license: pending.license || null,
      reason: pending.reason || null
    };
    if (action === 'giveAllMoney') {
      const amount = Number(q('#economy input[type="number"]')?.value || 0);
      payload.amount = amount;
    }
    if (action === 'giveCash' || action === 'giveBank' || action === 'removeMoney') {
      const amount = Number(inputValue || 0);
      payload.amount = amount;
    }
    if (action === 'giveAllMoney' && (!payload.amount || payload.amount <= 0)) {
      showToastSafe('warning', 'Invalid Amount', 'Enter a valid amount.');
      return;
    }
    if ((action === 'giveCash' || action === 'giveBank' || action === 'removeMoney') && (!payload.amount || payload.amount <= 0)) {
      showToastSafe('warning', 'Invalid Amount', 'Enter a valid amount.');
      return;
    }
    if ((action === 'kick' || action === 'ban' || action === 'warn' || action === 'message' || action === 'giveItem' || action === 'giveAllItems' || action === 'openStash' || action === 'openTrunk' || action === 'clearOffline' || action === 'clearOfflineInventory' || action === 'clearOfflineByLicense' || action === 'deleteOfflineCharacter' || action === 'offlineGiveItem' || action === 'offlineRemoveItem' || action === 'offlineMoney' || action === 'offlineSetJob' || action === 'offlineSetGang' || action === 'offlineSetName' || action === 'offlineSetMetadata' || action === 'offlineBanLicense' || action === 'offlineUnbanLicense' || action === 'setAmmo' || action === 'setBucket' || action === 'checkPerms' || action === 'announce' || action === 'changePlate' || action === 'runCommand' || action === 'changeCharacterName') && !payload.input) {
      showToastSafe('warning', 'Missing Input', 'Please enter a value.');
      return;
    }

    if ((action === 'setJob' || action === 'setGang' || action === 'offlineSetJob' || action === 'offlineSetGang' || action === 'offlineGiveItem' || action === 'offlineRemoveItem' || action === 'setVehicleState') && (!selectValue || !inputValue)) {
      showToastSafe('warning', 'Missing Input', 'Please select a value and enter amount/grade.');
      return;
    }

    if (action === 'setPermissions' && !selectValue) {
      showToastSafe('warning', 'Missing Input', 'Please select a permission.');
      return;
    }

    if (action === 'announce' && !inputValue) {
      showToastSafe('warning', 'Missing Input', 'Enter a message.');
      return;
    }

    if ((action === 'kick' || action === 'ban' || action === 'warn' || action === 'message' || action === 'giveItem' || action === 'openInventory' || action === 'clearInventory' || action === 'giveCash' || action === 'giveBank' || action === 'removeMoney' || action === 'setJob' || action === 'setGang' || action === 'setPermissions' || action === 'setBucket' || action === 'setPed' || action === 'revivePlayer' || action === 'killPlayer' || action === 'explodePlayer' || action === 'makeDrunk' || action === 'changeCharacterName' || action === 'deleteCharacter') && !target) {
      showToastSafe('warning', 'Select Player', 'Select a player first.');
      return;
    }

    if (action === 'setVehicleState') {
      const mode = String(pending.mode || 'in').toLowerCase();
      payload.input = `${mode} ${inputValue}`;
      payload.garage = selectValue;
    } else if (action === 'setJob' || action === 'setGang' || action === 'offlineSetJob' || action === 'offlineSetGang' || action === 'offlineGiveItem' || action === 'offlineRemoveItem') {
      payload.input = `${selectValue} ${inputValue}`;
    }
    if (action === 'setPermissions') {
      payload.input = selectValue;
    }

    doAction(action, payload);
  }

  function hookModal() {
    if (typeof window.showModal !== 'function') return;
    const originalShowModal = window.showModal;
    const originalConfirmModal = window.confirmModal;

    window.showModal = function(type, title, message, options = {}) {
      if (!options.skipAction) {
        state.pendingAction = null;
      }
      originalShowModal(type, title, message);
    };

    window.confirmModal = function() {
      const input = q('#modalInput') ? q('#modalInput').value : '';
      const selectValue = q('#modalSelect') ? q('#modalSelect').value : '';
      if (typeof window.closeModal === 'function') {
        window.closeModal();
      }
      executePending(input, selectValue);
      if (typeof originalConfirmModal === 'function') {
        return;
      }
    };
  }

  function hookToast() {
    if (typeof window.showToast !== 'function') return;
    const originalShowToast = window.showToast;
    const dedupeWindowMs = 1600;
    let lastToastAt = 0;
    let lastToastKey = '';
    window.showToast = function(type, title, message, options = {}) {
      const now = Date.now();
      const key = `${String(type || '').toLowerCase()}|${String(message || '').trim().toLowerCase()}`;
      if (key && key === lastToastKey && (now - lastToastAt) < dedupeWindowMs) {
        return;
      }
      lastToastKey = key;
      lastToastAt = now;
      if (options && options.skipAction) {
        return originalShowToast(type, title, message);
      }
      return originalShowToast(type, title, message);
    };
  }

  function hookClickSound() {
    let audioCtx = null;
    const ensureCtx = () => {
      if (audioCtx) return audioCtx;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      return audioCtx;
    };

    const playClick = () => {
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.03);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    };

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t) return;
      const clickable = t.closest('button, .nav-item, .header-btn, .action-btn, .grid-btn, .quick-btn, .profile-tab, .settings-item');
      if (!clickable) return;
      playClick();
    }, true);
  }

  function hookClose() {
    const closeBtn = q('#closeBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        nui('close');
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.visible) {
        nui('close');
      }
    });
  }

  function hookSettings() {
    const settingsBtn = q('#settingsBtn');
    const settingsMenu = q('#settingsMenu');
    if (!settingsBtn || !settingsMenu) return;
    const toggleOfflineBtn = q('[data-setting-action="toggleOfflineMode"]', settingsMenu);
    const toggleWhiteBtn = q('[data-setting-action="toggleWhiteMode"]', settingsMenu);

    const updateSettingsLabels = () => {
      if (toggleOfflineBtn) {
        toggleOfflineBtn.innerHTML = `<i class="fas fa-user-clock"></i> Offline Mode: ${state.offlineMode ? 'On' : 'Off'}`;
      }
      if (toggleWhiteBtn) {
        toggleWhiteBtn.innerHTML = `<i class="fas fa-circle-half-stroke"></i> White Mode: ${state.whiteMode ? 'On' : 'Off'}`;
      }
    };

    const closeMenu = () => settingsMenu.classList.remove('active');

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateSettingsLabels();
      settingsMenu.classList.toggle('active');
    });

    settingsMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.target.closest('[data-setting-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-setting-action');
      closeMenu();

      if (action === 'toggleOfflineMode') {
        setOfflineMode(!state.offlineMode);
        return;
      }

      if (action === 'toggleWhiteMode') {
        setWhiteMode(!state.whiteMode);
        updateSettingsLabels();
        return;
      }

      if (action === 'refreshData') {
        refreshAll();
        showToastSafe('success', 'Settings', 'Data refreshed.');
        return;
      }

      if (action === 'openDevTools') {
        if (state.offlineMode) {
          showToastSafe('warning', 'Offline Mode', 'Disable offline mode first.');
          return;
        }
        if (typeof window.navigateTo === 'function') {
          window.navigateTo('devtools');
        }
        showToastSafe('success', 'Settings', 'Opened Resources.');
        return;
      }

      if (action === 'resetUi') {
        state.selectedPlayer = null;
        qa('#playerTableBody tr').forEach((row) => { row.style.background = ''; });
        if (typeof window.navigateTo === 'function') {
          window.navigateTo(state.offlineMode ? 'offlinePlayers' : 'dashboard');
        }
        refreshAll();
        showToastSafe('success', 'Settings', 'UI reset completed.');
      }
    });

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'toggle') {
      setVisible(!!data.show);
      return;
    }
    if (data.type === 'clipboard' && data.value) {
      const text = String(data.value);
      let ok = false;
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(temp);

      if (ok) {
        showToastSafe('success', 'Copied', 'Coordinates copied.');
      } else {
        showToastSafe('warning', 'Clipboard', 'Copy failed.');
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const titleEl = q('#brandTitle');
    const byEl = q('#brandBy');
    if (titleEl) state.brandTitle = cleanText(titleEl.textContent);
    if (byEl) state.brandBy = cleanText(byEl.textContent);
    ensureBranding();
    if (typeof MutationObserver !== 'undefined') {
      const brandObserver = new MutationObserver(() => ensureBranding());
      brandObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    try {
      state.whiteMode = localStorage.getItem('reda_adminmenu_white_mode') === '1';
    } catch (e) {
      state.whiteMode = false;
    }
    applyWhiteModeUI();
    hookToast();
    hookClickSound();
    hookModal();
    hookClose();
    hookSettings();
    showPlayerListView();
    applyOfflineModeUI();
    setVisible(false);
    bindSectionButtons();
    if (typeof GetParentResourceName === 'function') {
      refreshAll();
    }
    const dutyBtn = q('#adminDutyBtn');
    if (dutyBtn) {
      dutyBtn.addEventListener('click', () => {
        const isOn = dutyBtn.textContent.includes('Off');
        const next = !isOn;
        doAction('toggleDuty', { state: next });
      });
    }
    const profileTabs = qa('.profile-tab');
    profileTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        profileTabs.forEach((t) => t.classList.remove('active'));
        qa('.profile-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = q(`.profile-panel[data-panel="${name}"]`);
        if (panel) panel.classList.add('active');
        if (state.selectedPlayer) {
          if (name === 'inventory') loadPlayerInventory(state.selectedPlayer.id);
          if (name === 'vehicles') loadPlayerVehicles(state.selectedPlayer.id);
        }
      });
    });

    qa('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-copy');
        const el = id ? q(`#${id}`) : null;
        if (!el) return;
        const text = (el.textContent || '').trim();
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            showToastSafe('success', 'Copied', 'Value copied.');
            return;
          } catch (e) {
            // fallback below
          }
        }
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        try {
          document.execCommand('copy');
          showToastSafe('success', 'Copied', 'Value copied.');
        } catch (e) {
          showToastSafe('warning', 'Clipboard', 'Copy failed.');
        }
        document.body.removeChild(temp);
      });
    });

    const backBtn = q('#backToPlayersBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        showPlayerListView();
      });
    }

    qa('.nav-item[data-section="players"]').forEach((item) => {
      item.addEventListener('click', () => {
        if (!state.offlineMode) showPlayerListView();
      });
    });

    const offlinePlayersSearch = q('#offlinePlayersSearch');
    if (offlinePlayersSearch) {
      offlinePlayersSearch.addEventListener('input', () => {
        renderOfflinePlayers(state.offlinePlayers);
      });
    }

    const offlineCharactersSearch = q('#offlineCharactersSearch');
    if (offlineCharactersSearch) {
      offlineCharactersSearch.addEventListener('input', () => {
        renderOfflineCharacters(state.offlineCharacters);
      });
    }

    const offlineBansSearch = q('#offlineBansSearch');
    if (offlineBansSearch) {
      offlineBansSearch.addEventListener('input', () => {
        renderOfflineBans(state.offlineBans);
      });
    }

    const resourceSearch = q('#resourceSearch');
    if (resourceSearch) {
      resourceSearch.addEventListener('input', () => {
        renderResources(state.resources);
      });
    }

    const clearFilterBtn = q('#offlineClearFilterBtn');
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', () => {
        state.offlineLicenseFilter = null;
        renderOfflineCharacters(state.offlineCharacters);
      });
    }

    const offlineOpenBanListBtn = q('#offlineOpenBanListBtn');
    if (offlineOpenBanListBtn) {
      offlineOpenBanListBtn.addEventListener('click', () => {
        if (typeof window.navigateTo === 'function') window.navigateTo('offlineBans');
      });
    }

    const offlineGiveItemBtn = q('#offlineGiveItemBtn');
    if (offlineGiveItemBtn) {
      offlineGiveItemBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        const playerName = getSelectedOfflinePlayerName();
        openSelectInputModal(`Give Offline Item - ${playerName}`, 'Select item and amount:', {
          action: 'offlineGiveItem',
          citizenid: state.offlineSelectedCitizenid
        }, 'items', 'Item', 'Amount', 'Enter amount');
      });
    }

    const offlineRemoveItemBtn = q('#offlineRemoveItemBtn');
    if (offlineRemoveItemBtn) {
      offlineRemoveItemBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        if (!state.offlineInventoryItems || !state.offlineInventoryItems.length) {
          showToastSafe('warning', 'No Items', 'Selected character inventory is empty.');
          return;
        }
        const options = state.offlineInventoryItems
          .filter((item) => (Number(item.amount || 0) > 0))
          .map((item) => ({ value: item.name, label: `${item.label || item.name} (x${item.amount || 0})` }));
        if (!options.length) {
          showToastSafe('warning', 'No Items', 'No removable items found in inventory.');
          return;
        }
        setModalSelectOptions(options, 'Item');
        const inputLabelEl = q('#modalInputLabel');
        const inputEl = q('#modalInput');
        if (inputLabelEl) inputLabelEl.textContent = 'Amount';
        if (inputEl) inputEl.placeholder = 'Enter amount';
        const playerName = getSelectedOfflinePlayerName();
        openModal('select_input', `Remove Offline Item - ${playerName}`, 'Select existing inventory item and amount:', {
          action: 'offlineRemoveItem',
          citizenid: state.offlineSelectedCitizenid
        });
      });
    }

    const offlineClearInvBtn = q('#offlineClearInvBtn');
    if (offlineClearInvBtn) {
      offlineClearInvBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        openModal('confirm', 'Clear Offline Inventory', 'Clear selected character inventory?', {
          action: 'clearOfflineInventory',
          citizenid: state.offlineSelectedCitizenid,
          input: state.offlineSelectedCitizenid
        });
      });
    }

    const offlineMoneyBtn = q('#offlineMoneyBtn');
    if (offlineMoneyBtn) {
      offlineMoneyBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        openModal('input', 'Offline Money', 'Use: set/add/remove cash|bank amount', {
          action: 'offlineMoney',
          citizenid: state.offlineSelectedCitizenid
        });
      });
    }

    const offlineSetJobBtn = q('#offlineSetJobBtn');
    if (offlineSetJobBtn) {
      offlineSetJobBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        const playerName = getSelectedOfflinePlayerName();
        openSelectInputModal(`Set Offline Job - ${playerName}`, `Player: ${playerName} | Select job and grade:`, {
          action: 'offlineSetJob',
          citizenid: state.offlineSelectedCitizenid
        }, 'jobs', 'Job', 'Grade', 'Enter grade (number)');
      });
    }

    const offlineSetGangBtn = q('#offlineSetGangBtn');
    if (offlineSetGangBtn) {
      offlineSetGangBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        const playerName = getSelectedOfflinePlayerName();
        openSelectInputModal(`Set Offline Gang - ${playerName}`, `Player: ${playerName} | Select gang and grade:`, {
          action: 'offlineSetGang',
          citizenid: state.offlineSelectedCitizenid
        }, 'gangs', 'Gang', 'Grade', 'Enter grade (number)');
      });
    }

    const offlineSetNameBtn = q('#offlineSetNameBtn');
    if (offlineSetNameBtn) {
      offlineSetNameBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        openModal('input', 'Set Offline Name', 'Use: Firstname Lastname', {
          action: 'offlineSetName',
          citizenid: state.offlineSelectedCitizenid
        });
      });
    }

    const offlineMetaBtn = q('#offlineMetaBtn');
    if (offlineMetaBtn) {
      offlineMetaBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        openModal('input', 'Set Offline Metadata', 'Use: hunger/thirst/stress value', {
          action: 'offlineSetMetadata',
          citizenid: state.offlineSelectedCitizenid
        });
      });
    }

    const offlineDeleteCharBtn = q('#offlineDeleteCharBtn');
    if (offlineDeleteCharBtn) {
      offlineDeleteCharBtn.addEventListener('click', () => {
        if (!requireOfflineCharacterSelected()) return;
        openModal('confirm', 'Delete Offline Character', 'Delete selected character permanently?', {
          action: 'deleteOfflineCharacter',
          citizenid: state.offlineSelectedCitizenid,
          input: state.offlineSelectedCitizenid
        });
      });
    }

    const offlineBanLicenseBtn = q('#offlineBanLicenseBtn');
    if (offlineBanLicenseBtn) {
      offlineBanLicenseBtn.addEventListener('click', () => {
        const license = getOfflineLicenseForBan();
        if (!license) {
          showToastSafe('warning', 'Select Player', 'Select an offline player/license first.');
          return;
        }
        const playerName = getOfflinePlayerNameByLicense(license);
        openModal('input', `Ban License - ${playerName}`, 'Enter ban reason:', {
          action: 'offlineBanLicense',
          license,
          citizenid: state.offlineSelectedCitizenid || null
        });
      });
    }

    qa('#playerProfileCard [data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const target = getSelectedPlayerId();
        if (!target) return showToastSafe('warning', 'Select Player', 'Select a player first.');
        if (action === 'warn') {
          openModal('input', 'Warn Player', 'Enter warning reason:', { action: 'warn', target });
          return;
        }
        if (action === 'kick') {
          openModal('input', 'Kick Player', 'Enter kick reason:', { action: 'kick', target });
          return;
        }
        if (action === 'ban') {
          openModal('input', 'Ban Player', 'Enter ban reason:', { action: 'ban', target });
          return;
        }
        if (action === 'setJob') {
          openSelectInputModal('Set Job', 'Select job and grade:', { action: 'setJob', target }, 'jobs', 'Job', 'Grade', 'Enter grade (number)');
          return;
        }
        if (action === 'setGang') {
          openSelectInputModal('Set Gang', 'Select gang and grade:', { action: 'setGang', target }, 'gangs', 'Gang', 'Grade', 'Enter grade (number)');
          return;
        }
        if (action === 'setPermissions') {
          openSelectModal('Permissions', 'Set permission level:', { action: 'setPermissions', target }, 'perms', 'Permission');
          return;
        }
        if (action === 'setBucket') {
          openModal('input', 'Set Bucket', 'Enter bucket ID:', { action: 'setBucket', target });
          return;
        }
        if (action === 'changeCharacterName') {
          openModal('input', 'Change Character Name', 'Enter full name (First Last):', { action: 'changeCharacterName', target });
          return;
        }
        if (action === 'deleteCharacter') {
          openModal('confirm', 'Delete Character', 'Delete this character permanently?', { action: 'deleteCharacter', target });
          return;
        }
        if (action === 'giveItem') {
          openModal('input', 'Give Item', 'Enter item and amount:', { action: 'giveItem', target });
          return;
        }
        if (action === 'giveCash') {
          openModal('input', 'Give Cash', 'Enter amount:', { action: 'giveCash', target });
          return;
        }
        if (action === 'giveBank') {
          openModal('input', 'Give Bank', 'Enter amount:', { action: 'giveBank', target });
          return;
        }
        if (action === 'removeMoney') {
          openModal('input', 'Remove Money', 'Enter amount:', { action: 'removeMoney', target });
          return;
        }
        if (action === 'spawnVehicle') {
          openModal('input', 'Spawn Vehicle', 'Enter vehicle model:', { action: 'spawnVehicle', target });
          return;
        }
        if (action === 'giveVehicle') {
          openModal('input', 'Give Vehicle', 'Enter vehicle model:', { action: 'giveVehicle', target });
          return;
        }
        if (action === 'changePlate') {
          openModal('input', 'Change Plate', 'Enter new plate:', { action: 'changePlate', target });
          return;
        }
        doAction(action, { target });
      });
    });
  });
})();
