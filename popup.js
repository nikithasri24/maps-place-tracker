// Popup script for Maps Place Tracker

class PopupManager {
  constructor() {
    this.todoPlaces = [];
    this.visitedPlaces = [];
    this.settings = {};
    
    this.init();
  }

  async init() {
    // Load data
    await this.loadData();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Render initial content
    this.renderTodoList();
    this.renderVisitedList();
    this.renderSettings();
    
    console.log('Popup initialized');
  }

  async loadData() {
    try {
      // Load todo places
      const todoResponse = await this.sendMessage({ action: 'getTodoPlaces' });
      if (todoResponse.success) {
        this.todoPlaces = todoResponse.data;
      }

      // Load visited places
      const visitedResponse = await this.sendMessage({ action: 'getVisitedPlaces' });
      if (visitedResponse.success) {
        this.visitedPlaces = visitedResponse.data;
      }

      // Load settings
      const settingsResponse = await this.sendMessage({ action: 'getSettings' });
      if (settingsResponse.success) {
        this.settings = settingsResponse.data;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Settings
    document.getElementById('auto-prompt').addEventListener('change', (e) => {
      this.updateSetting('autoPrompt', e.target.checked);
    });

    document.getElementById('show-visited').addEventListener('change', (e) => {
      this.updateSetting('showVisited', e.target.checked);
    });

    document.getElementById('prompt-delay').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('delay-value').textContent = `${value}s`;
      this.updateSetting('promptDelay', value * 1000); // Convert to milliseconds
    });

    // Actions
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('import-data').addEventListener('click', () => {
      this.importData();
    });

    document.getElementById('clear-data').addEventListener('click', () => {
      this.clearData();
    });

    // File input for import
    document.getElementById('file-input').addEventListener('change', (e) => {
      this.handleFileImport(e);
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  renderTodoList() {
    const container = document.getElementById('todo-list');
    const countElement = document.getElementById('todo-count');
    
    countElement.textContent = this.todoPlaces.length;

    if (this.todoPlaces.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>📍 No places in your todo list yet</p>
          <small>Visit Google Maps and add places you want to visit!</small>
        </div>
      `;
      return;
    }

    container.innerHTML = this.todoPlaces.map(place => `
      <div class="place-item" data-id="${place.id}">
        <div class="place-name">${this.escapeHtml(place.name)}</div>
        <div class="place-address">${this.escapeHtml(place.address || 'Address not available')}</div>
        <div class="place-meta">
          <div class="place-date">Added ${this.formatDate(place.addedAt)}</div>
          <div class="place-actions">
            <button class="action-btn visit" onclick="popup.visitPlace('${place.id}')" title="Mark as visited">
              ✅
            </button>
            <button class="action-btn remove" onclick="popup.removeTodoPlace('${place.id}')" title="Remove from todo">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderVisitedList() {
    const container = document.getElementById('visited-list');
    const countElement = document.getElementById('visited-count');
    
    countElement.textContent = this.visitedPlaces.length;

    if (this.visitedPlaces.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>✅ No visited places yet</p>
          <small>Mark places as visited to see them here!</small>
        </div>
      `;
      return;
    }

    container.innerHTML = this.visitedPlaces.map(place => `
      <div class="place-item" data-id="${place.id}">
        <div class="place-name">${this.escapeHtml(place.name)}</div>
        <div class="place-address">${this.escapeHtml(place.address || 'Address not available')}</div>
        <div class="place-meta">
          <div class="place-date">Visited ${this.formatDate(place.visitedAt)}</div>
          <div class="place-actions">
            <button class="action-btn visit" onclick="popup.openPlace('${encodeURIComponent(place.url)}')" title="View on Google Maps">
              🗺️
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderSettings() {
    document.getElementById('auto-prompt').checked = this.settings.autoPrompt !== false;
    document.getElementById('show-visited').checked = this.settings.showVisited !== false;
    
    const promptDelay = (this.settings.promptDelay || 2000) / 1000;
    document.getElementById('prompt-delay').value = promptDelay;
    document.getElementById('delay-value').textContent = `${promptDelay}s`;
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      await this.sendMessage({ 
        action: 'updateSettings', 
        settings: { [key]: value }
      });
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  }

  async visitPlace(placeId) {
    try {
      const response = await this.sendMessage({ 
        action: 'markAsVisited', 
        placeId 
      });
      
      if (response.success) {
        await this.loadData();
        this.renderTodoList();
        this.renderVisitedList();
      }
    } catch (error) {
      console.error('Error marking place as visited:', error);
    }
  }

  async removeTodoPlace(placeId) {
    if (!confirm('Are you sure you want to remove this place from your todo list?')) {
      return;
    }

    try {
      const response = await this.sendMessage({ 
        action: 'removeTodoPlace', 
        placeId 
      });
      
      if (response.success) {
        await this.loadData();
        this.renderTodoList();
      }
    } catch (error) {
      console.error('Error removing todo place:', error);
    }
  }

  openPlace(url) {
    chrome.tabs.create({ url: decodeURIComponent(url) });
  }

  exportData() {
    const data = {
      todoPlaces: this.todoPlaces,
      visitedPlaces: this.visitedPlaces,
      settings: this.settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maps-place-tracker-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importData() {
    document.getElementById('file-input').click();
  }

  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.todoPlaces && !data.visitedPlaces) {
        alert('Invalid file format');
        return;
      }

      if (!confirm('This will replace all your current data. Are you sure?')) {
        return;
      }

      // Import data via background script
      if (data.todoPlaces) {
        for (const place of data.todoPlaces) {
          await this.sendMessage({ action: 'addTodoPlace', place });
        }
      }

      if (data.visitedPlaces) {
        // Note: This would need additional background script methods to import visited places
        console.log('Visited places import not yet implemented');
      }

      if (data.settings) {
        await this.sendMessage({ action: 'updateSettings', settings: data.settings });
      }

      // Reload data
      await this.loadData();
      this.renderTodoList();
      this.renderVisitedList();
      this.renderSettings();

      alert('Data imported successfully!');

    } catch (error) {
      console.error('Error importing data:', error);
      alert('Error importing data. Please check the file format.');
    }

    // Reset file input
    event.target.value = '';
  }

  async clearData() {
    if (!confirm('This will delete all your todo and visited places. Are you sure?')) {
      return;
    }

    if (!confirm('This action cannot be undone. Are you really sure?')) {
      return;
    }

    try {
      // Clear storage
      await chrome.storage.local.clear();
      
      // Reload data
      await this.loadData();
      this.renderTodoList();
      this.renderVisitedList();

      alert('All data cleared successfully!');

    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data.');
    }
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is ready
let popup;

document.addEventListener('DOMContentLoaded', () => {
  popup = new PopupManager();
});