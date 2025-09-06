// Content script for Maps Place Tracker
// Injects into Google Maps pages to detect places and add UI

class MapsPlaceTracker {
  constructor() {
    this.currentPlace = null;
    this.settings = {};
    this.isInitialized = false;
    this.observers = [];
    
    this.init();
  }

  async init() {
    console.log('Maps Place Tracker initializing...');
    
    // Wait for Google Maps to load
    await this.waitForMapsToLoad();
    
    // Load settings
    await this.loadSettings();
    
    // Set up place detection
    this.setupPlaceDetection();
    
    // Add UI elements
    this.addControlsUI();
    
    this.isInitialized = true;
    console.log('Maps Place Tracker initialized successfully');
  }

  async waitForMapsToLoad() {
    return new Promise((resolve) => {
      const checkForMaps = () => {
        // Check for Google Maps specific elements
        const mapContainer = document.querySelector('#map') || 
                           document.querySelector('[data-value="Map"]') ||
                           document.querySelector('.widget-scene-canvas');
        
        if (mapContainer && window.google && window.google.maps) {
          resolve();
        } else {
          setTimeout(checkForMaps, 1000);
        }
      };
      checkForMaps();
    });
  }

  async loadSettings() {
    try {
      const response = await this.sendMessage({ action: 'getSettings' });
      if (response.success) {
        this.settings = response.data;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupPlaceDetection() {
    // Watch for URL changes (Google Maps is a SPA)
    this.watchUrlChanges();
    
    // Watch for place panel changes
    this.watchPlacePanel();
    
    // Initial check
    this.checkCurrentPlace();
  }

  watchUrlChanges() {
    let lastUrl = location.href;
    
    const urlObserver = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(() => this.checkCurrentPlace(), 1000);
      }
    });
    
    urlObserver.observe(document, { 
      subtree: true, 
      childList: true 
    });
    
    this.observers.push(urlObserver);
  }

  watchPlacePanel() {
    // Watch for changes in the place information panel
    const panelObserver = new MutationObserver(() => {
      this.checkCurrentPlace();
    });
    
    // Start observing the entire document for changes
    panelObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-value', 'aria-label', 'jsaction']
    });
    
    this.observers.push(panelObserver);
  }

  async checkCurrentPlace() {
    const placeInfo = this.extractPlaceInfo();
    
    if (placeInfo && (!this.currentPlace || this.currentPlace.name !== placeInfo.name)) {
      this.currentPlace = placeInfo;
      console.log('New place detected:', placeInfo);
      
      // Check place status and show prompt if needed
      await this.handlePlaceDetection(placeInfo);
    }
  }

  extractPlaceInfo() {
    try {
      // Try multiple selectors for place name
      const nameSelectors = [
        'h1[data-value="Place name"]',
        'h1[data-value]',
        '[data-value="Place name"]',
        '.x3AX1-LfntMc-header-title-title',
        '.DUwDvf.lfPIob',
        'h1.DUwDvf',
        '[role="main"] h1'
      ];
      
      let nameElement = null;
      for (const selector of nameSelectors) {
        nameElement = document.querySelector(selector);
        if (nameElement && nameElement.textContent.trim()) {
          break;
        }
      }
      
      if (!nameElement || !nameElement.textContent.trim()) {
        return null;
      }
      
      const name = nameElement.textContent.trim();
      
      // Try to extract address
      const addressSelectors = [
        '[data-value="Address"]',
        '.Io6YTe.fontBodyMedium',
        '.rogA2c .Io6YTe'
      ];
      
      let address = '';
      for (const selector of addressSelectors) {
        const addressElement = document.querySelector(selector);
        if (addressElement && addressElement.textContent.trim()) {
          address = addressElement.textContent.trim();
          break;
        }
      }
      
      // Extract coordinates from URL if available
      const urlMatch = location.href.match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/);
      let lat = null, lng = null;
      if (urlMatch) {
        lat = parseFloat(urlMatch[1]);
        lng = parseFloat(urlMatch[2]);
      }
      
      // Try to extract place ID from URL or data attributes
      let placeId = '';
      const placeIdMatch = location.href.match(/place\\/([^/]+)/);
      if (placeIdMatch) {
        placeId = placeIdMatch[1];
      }
      
      return {
        name,
        address,
        lat,
        lng,
        placeId,
        url: location.href,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error extracting place info:', error);
      return null;
    }
  }

  async handlePlaceDetection(place) {
    try {
      // Check place status
      const response = await this.sendMessage({ 
        action: 'checkPlace', 
        place 
      });
      
      if (response.success) {
        const { isTodo, isVisited, shouldPrompt } = response.data;
        
        // Update UI indicators
        this.updatePlaceIndicators(isTodo, isVisited);
        
        // Show prompt if needed
        if (shouldPrompt && this.settings.autoPrompt) {
          setTimeout(() => {
            this.showVisitedPrompt(place);
          }, this.settings.promptDelay || 2000);
        }
      }
    } catch (error) {
      console.error('Error handling place detection:', error);
    }
  }

  updatePlaceIndicators(isTodo, isVisited) {
    // Remove existing indicators
    const existingIndicators = document.querySelectorAll('.place-tracker-indicator');
    existingIndicators.forEach(el => el.remove());
    
    // Find the place name element
    const nameElement = document.querySelector('h1[data-value="Place name"], h1[data-value], .DUwDvf.lfPIob');
    
    if (nameElement) {
      const indicator = document.createElement('div');
      indicator.className = 'place-tracker-indicator';
      
      if (isVisited) {
        indicator.innerHTML = '✅ Visited';
        indicator.style.color = '#4CAF50';
      } else if (isTodo) {
        indicator.innerHTML = '📍 On Todo List';
        indicator.style.color = '#FF9800';
      } else {
        return; // No indicator needed
      }
      
      indicator.style.fontSize = '14px';
      indicator.style.fontWeight = 'bold';
      indicator.style.marginLeft = '8px';
      indicator.style.display = 'inline-block';
      
      nameElement.appendChild(indicator);
    }
  }

  showVisitedPrompt(place) {
    // Create and show a custom prompt
    const overlay = document.createElement('div');
    overlay.className = 'place-tracker-prompt-overlay';
    overlay.innerHTML = `
      <div class="place-tracker-prompt">
        <h3>Have you visited this place?</h3>
        <p><strong>${place.name}</strong></p>
        <p class="address">${place.address || 'Address not available'}</p>
        <div class="prompt-buttons">
          <button class="btn-yes">Yes, I've visited</button>
          <button class="btn-no">Not yet</button>
          <button class="btn-cancel">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Handle button clicks
    overlay.querySelector('.btn-yes').addEventListener('click', async () => {
      await this.markAsVisited(place);
      overlay.remove();
    });
    
    overlay.querySelector('.btn-no').addEventListener('click', () => {
      overlay.remove();
    });
    
    overlay.querySelector('.btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 30000);
  }

  async markAsVisited(place) {
    try {
      const response = await this.sendMessage({ 
        action: 'markAsVisited', 
        placeId: place.placeId || place.name 
      });
      
      if (response.success) {
        // Update UI
        this.updatePlaceIndicators(false, true);
        
        // Show success message
        this.showNotification('✅ Marked as visited!', 'success');
      }
    } catch (error) {
      console.error('Error marking as visited:', error);
      this.showNotification('❌ Error marking as visited', 'error');
    }
  }

  addControlsUI() {
    // Add a floating control panel
    const controls = document.createElement('div');
    controls.className = 'place-tracker-controls';
    controls.innerHTML = `
      <div class="controls-header">
        <span>Place Tracker</span>
        <button class="toggle-btn">📍</button>
      </div>
      <div class="controls-body" style="display: none;">
        <button class="add-todo-btn">Add to Todo</button>
        <button class="mark-visited-btn">Mark Visited</button>
        <button class="toggle-visited-btn">Toggle Visited</button>
        <button class="open-popup-btn">Manage Lists</button>
      </div>
    `;
    
    document.body.appendChild(controls);
    
    // Add event listeners
    controls.querySelector('.toggle-btn').addEventListener('click', () => {
      const body = controls.querySelector('.controls-body');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });
    
    controls.querySelector('.add-todo-btn').addEventListener('click', () => {
      if (this.currentPlace) {
        this.addToTodo(this.currentPlace);
      }
    });
    
    controls.querySelector('.mark-visited-btn').addEventListener('click', () => {
      if (this.currentPlace) {
        this.markAsVisited(this.currentPlace);
      }
    });
    
    controls.querySelector('.toggle-visited-btn').addEventListener('click', () => {
      this.toggleVisitedPlaces();
    });
  }

  async addToTodo(place) {
    try {
      const response = await this.sendMessage({ 
        action: 'addTodoPlace', 
        place 
      });
      
      if (response.success) {
        this.showNotification('📍 Added to todo list!', 'success');
        this.updatePlaceIndicators(true, false);
      }
    } catch (error) {
      console.error('Error adding to todo:', error);
      this.showNotification('❌ Error adding to todo', 'error');
    }
  }

  toggleVisitedPlaces() {
    // This would integrate with the Google Maps API to show/hide markers
    // For now, just toggle the setting
    this.settings.showVisited = !this.settings.showVisited;
    this.sendMessage({ 
      action: 'updateSettings', 
      settings: this.settings 
    });
    
    const status = this.settings.showVisited ? 'shown' : 'hidden';
    this.showNotification(`Visited places ${status}`, 'info');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `place-tracker-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
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

  destroy() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Remove UI elements
    const elements = document.querySelectorAll('.place-tracker-controls, .place-tracker-indicator, .place-tracker-prompt-overlay, .place-tracker-notification');
    elements.forEach(el => el.remove());
  }
}

// Initialize when the script loads
let placeTracker = null;

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracker);
} else {
  initializeTracker();
}

function initializeTracker() {
  // Only initialize on Google Maps pages
  if (window.location.hostname.includes('google.com') && 
      (window.location.pathname.includes('/maps') || window.location.pathname.includes('/search'))) {
    
    if (placeTracker) {
      placeTracker.destroy();
    }
    
    placeTracker = new MapsPlaceTracker();
  }
}