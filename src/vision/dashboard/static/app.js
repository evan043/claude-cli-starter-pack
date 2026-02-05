/**
 * Vision Dashboard Client Application
 * CCASP Vision Mode - Phase 9
 */

// State
let state = {
  visions: [],
  filter: '',
  connected: false,
  ws: null,
  selectedVision: null
};

// DOM Elements
const elements = {
  connectionStatus: document.getElementById('connection-status'),
  refreshBtn: document.getElementById('refresh-btn'),
  totalVisions: document.getElementById('total-visions'),
  activeVisions: document.getElementById('active-visions'),
  completedVisions: document.getElementById('completed-visions'),
  driftEvents: document.getElementById('drift-events'),
  filterStatus: document.getElementById('filter-status'),
  visionsList: document.getElementById('visions-list'),
  modal: document.getElementById('vision-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  lastUpdate: document.getElementById('last-update')
};

// Status emoji map
const STATUS_EMOJI = {
  not_started: '\u{1F4DD}',
  analyzing: '\u{1F50D}',
  architecting: '\u{1F3D7}',
  orchestrating: '\u{1F3AD}',
  executing: '\u26A1',
  validating: '\u2705',
  completed: '\u{1F389}',
  failed: '\u274C',
  paused: '\u23F8'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  setupEventListeners();
});

/**
 * Initialize WebSocket connection
 */
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    state.connected = true;
    updateConnectionStatus();
    console.log('[Dashboard] WebSocket connected');
  };

  state.ws.onclose = () => {
    state.connected = false;
    updateConnectionStatus();
    console.log('[Dashboard] WebSocket disconnected');

    // Reconnect after delay
    setTimeout(initWebSocket, 3000);
  };

  state.ws.onerror = (error) => {
    console.error('[Dashboard] WebSocket error:', error);
  };

  state.ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (error) {
      console.error('[Dashboard] Failed to parse message:', error);
    }
  };
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(data) {
  switch (data.type) {
    case 'update':
      state.visions = data.visions || [];
      updateUI();
      updateLastUpdate(data.timestamp);
      break;

    case 'error':
      console.error('[Dashboard] Server error:', data.message);
      break;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Refresh button
  elements.refreshBtn.addEventListener('click', () => {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'refresh' }));
    }
  });

  // Filter dropdown
  elements.filterStatus.addEventListener('change', (e) => {
    state.filter = e.target.value;
    renderVisionsList();
  });

  // Modal close
  elements.modal.querySelector('.modal-close').addEventListener('click', closeModal);
  elements.modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

/**
 * Update all UI elements
 */
function updateUI() {
  updateSummaryCards();
  renderVisionsList();
}

/**
 * Update summary cards
 */
function updateSummaryCards() {
  const total = state.visions.length;
  const active = state.visions.filter(v => ['executing', 'analyzing', 'architecting', 'orchestrating', 'validating'].includes(v.status)).length;
  const completed = state.visions.filter(v => v.status === 'completed').length;
  const drift = state.visions.reduce((sum, v) => sum + (v.driftEvents || 0), 0);

  elements.totalVisions.textContent = total;
  elements.activeVisions.textContent = active;
  elements.completedVisions.textContent = completed;
  elements.driftEvents.textContent = drift;
}

/**
 * Render visions list
 */
function renderVisionsList() {
  let visions = state.visions;

  // Apply filter
  if (state.filter) {
    visions = visions.filter(v => v.status === state.filter);
  }

  if (visions.length === 0) {
    elements.visionsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">\u{1F441}</div>
        <p>${state.filter ? 'No visions match the filter' : 'No visions found'}</p>
        <p class="empty-hint">Create a vision with <code>/vision-init</code></p>
      </div>
    `;
    return;
  }

  elements.visionsList.innerHTML = visions.map(vision => createVisionCard(vision)).join('');

  // Add click handlers
  elements.visionsList.querySelectorAll('.vision-card').forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.dataset.slug;
      const vision = state.visions.find(v => v.slug === slug);
      if (vision) {
        openModal(vision);
      }
    });
  });
}

/**
 * Create vision card HTML
 */
function createVisionCard(vision) {
  const completionPct = Math.round(vision.completion || 0);
  const alignmentPct = Math.round((vision.alignment || 1) * 100);
  const statusEmoji = STATUS_EMOJI[vision.status] || '\u2753';
  const stage = vision.orchestrator?.stage || 'unknown';

  return `
    <div class="vision-card ${vision.status}" data-slug="${escapeHtml(vision.slug)}">
      <div class="vision-card-header">
        <div>
          <div class="vision-title">${escapeHtml(vision.title)}</div>
          <div class="vision-slug">${escapeHtml(vision.slug)}</div>
        </div>
        <span class="vision-status ${vision.status}">${statusEmoji} ${formatStatus(vision.status)}</span>
      </div>

      <div class="vision-progress">
        <div class="progress-row">
          <span class="progress-label">Progress</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${completionPct}%"></div>
          </div>
          <span class="progress-value">${completionPct}%</span>
        </div>
        <div class="progress-row">
          <span class="progress-label">Alignment</span>
          <div class="progress-bar">
            <div class="progress-fill ${alignmentPct < 90 ? 'warning' : ''} ${alignmentPct < 70 ? 'danger' : ''}" style="width: ${alignmentPct}%"></div>
          </div>
          <span class="progress-value">${alignmentPct}%</span>
        </div>
      </div>

      <div class="vision-stats">
        <div class="stat">
          <span class="stat-value">${vision.roadmaps?.completed || 0}/${vision.roadmaps?.total || 0}</span>
          <span class="stat-label">Roadmaps</span>
        </div>
        <div class="stat">
          <span class="stat-value">${vision.driftEvents || 0}</span>
          <span class="stat-label">Drift Events</span>
        </div>
        <div class="stat">
          <span class="stage-badge">\u{1F3AF} ${formatStage(stage)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Open vision detail modal
 */
function openModal(vision) {
  state.selectedVision = vision;
  elements.modalTitle.textContent = vision.title;
  elements.modalBody.innerHTML = createDetailContent(vision);
  elements.modal.classList.remove('hidden');
}

/**
 * Close modal
 */
function closeModal() {
  elements.modal.classList.add('hidden');
  state.selectedVision = null;
}

/**
 * Create detail content HTML
 */
function createDetailContent(vision) {
  const completionPct = Math.round(vision.completion || 0);
  const alignmentPct = Math.round((vision.alignment || 1) * 100);
  const statusEmoji = STATUS_EMOJI[vision.status] || '\u2753';
  const stage = vision.orchestrator?.stage || 'unknown';

  return `
    <div class="detail-section">
      <h3 class="detail-section-title">\u{1F4CA} Overview</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-item-label">Status</div>
          <div class="detail-item-value">${statusEmoji} ${formatStatus(vision.status)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Stage</div>
          <div class="detail-item-value">${formatStage(stage)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Progress</div>
          <div class="detail-item-value">${completionPct}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Alignment</div>
          <div class="detail-item-value">${alignmentPct}%</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3 class="detail-section-title">\u{1F5FA} Roadmaps</h3>
      ${vision.roadmaps?.total > 0 ? `
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-item-label">Total</div>
            <div class="detail-item-value">${vision.roadmaps.total}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Completed</div>
            <div class="detail-item-value">${vision.roadmaps.completed}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">In Progress</div>
            <div class="detail-item-value">${vision.roadmaps.in_progress || 0}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Pending</div>
            <div class="detail-item-value">${vision.roadmaps.pending || 0}</div>
          </div>
        </div>
      ` : '<p class="empty-hint">No roadmaps created yet</p>'}
    </div>

    <div class="detail-section">
      <h3 class="detail-section-title">\u{1F441} Observer</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-item-label">Drift Events</div>
          <div class="detail-item-value">${vision.driftEvents || 0}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Current Alignment</div>
          <div class="detail-item-value ${alignmentPct < 90 ? 'warning' : ''}">${alignmentPct}%</div>
        </div>
      </div>
      ${alignmentPct < 90 ? `
        <p style="margin-top: var(--spacing-md); color: var(--color-warning-text);">
          \u26A0 Alignment below target (90%). Consider running <code>/vision-adjust ${vision.slug}</code>
        </p>
      ` : ''}
    </div>

    <div class="detail-section">
      <h3 class="detail-section-title">\u{1F4CB} Actions</h3>
      <div style="display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
        <button class="btn" onclick="copyCommand('/vision-status ${vision.slug}')">View Status</button>
        <button class="btn btn-primary" onclick="copyCommand('/vision-run ${vision.slug}')">Run Vision</button>
        <button class="btn" onclick="copyCommand('/vision-adjust ${vision.slug}')">Adjust Plan</button>
      </div>
    </div>

    ${vision.lastUpdated ? `
      <div class="detail-section">
        <p style="color: var(--text-muted); font-size: 0.75rem;">
          Last updated: ${formatTime(vision.lastUpdated)}
        </p>
      </div>
    ` : ''}
  `;
}

/**
 * Copy command to clipboard
 */
function copyCommand(command) {
  navigator.clipboard.writeText(command).then(() => {
    alert(`Copied: ${command}`);
  }).catch(() => {
    alert(`Command: ${command}`);
  });
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus() {
  elements.connectionStatus.textContent = state.connected ? 'Connected' : 'Disconnected';
  elements.connectionStatus.className = `status-badge ${state.connected ? 'connected' : 'disconnected'}`;
}

/**
 * Update last update timestamp
 */
function updateLastUpdate(timestamp) {
  if (timestamp) {
    elements.lastUpdate.textContent = `Last update: ${formatTime(timestamp)}`;
  }
}

/**
 * Format status for display
 */
function formatStatus(status) {
  const map = {
    not_started: 'Not Started',
    analyzing: 'Analyzing',
    architecting: 'Architecting',
    orchestrating: 'Orchestrating',
    executing: 'Executing',
    validating: 'Validating',
    completed: 'Completed',
    failed: 'Failed',
    paused: 'Paused'
  };
  return map[status] || status;
}

/**
 * Format stage for display
 */
function formatStage(stage) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make copyCommand available globally
window.copyCommand = copyCommand;
