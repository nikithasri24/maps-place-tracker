// Background script for Maps Place Tracker
// Handles data management and cross-tab communication

class PlaceDataManager {
  constructor() {
    this.todoPlaces = [];
    this.visitedPlaces = [];
    this.settings = {
      showVisited: true,
      autoPrompt: true,
      promptDelay: 2000
    };
    this.init();
  }

  async init() {
    // Load existing data from storage
    await this.loadData();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['todoPlaces', 'visitedPlaces', 'settings']);
      
      this.todoPlaces = result.todoPlaces || [];
      this.visitedPlaces = result.visitedPlaces || [];
      this.settings = { ...this.settings, ...result.settings };
      
      console.log('Loaded data:', {
        todoCount: this.todoPlaces.length,
        visitedCount: this.visitedPlaces.length,
        settings: this.settings
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({
        todoPlaces: this.todoPlaces,
        visitedPlaces: this.visitedPlaces,
        settings: this.settings
      });
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'checkPlace':
          const placeInfo = await this.checkPlace(message.place);
          sendResponse({ success: true, data: placeInfo });
          break;

        case 'addTodoPlace':
          await this.addTodoPlace(message.place);
          sendResponse({ success: true });
          break;

        case 'markAsVisited':
          await this.markAsVisited(message.placeId);
          sendResponse({ success: true });
          break;

        case 'removeTodoPlace':
          await this.removeTodoPlace(message.placeId);
          sendResponse({ success: true });
          break;

        case 'getTodoPlaces':
          sendResponse({ success: true, data: this.todoPlaces });
          break;

        case 'getVisitedPlaces':
          sendResponse({ success: true, data: this.visitedPlaces });
          break;

        case 'updateSettings':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'getSettings':
          sendResponse({ success: true, data: this.settings });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async checkPlace(place) {
    // Check if place is in todo list
    const todoPlace = this.todoPlaces.find(p => 
      p.placeId === place.placeId || 
      this.isSimilarPlace(p, place)
    );

    // Check if place is in visited list
    const visitedPlace = this.visitedPlaces.find(p => 
      p.placeId === place.placeId || 
      this.isSimilarPlace(p, place)
    );

    return {
      isTodo: !!todoPlace,
      isVisited: !!visitedPlace,
      todoData: todoPlace,
      visitedData: visitedPlace,
      shouldPrompt: !!todoPlace && !visitedPlace && this.settings.autoPrompt
    };
  }

  isSimilarPlace(place1, place2) {
    // Check if places are similar based on name and location
    if (!place1.name || !place2.name) return false;
    
    const nameSimilarity = this.calculateStringSimilarity(
      place1.name.toLowerCase(), 
      place2.name.toLowerCase()
    );
    
    // If we have coordinates, check distance
    if (place1.lat && place1.lng && place2.lat && place2.lng) {
      const distance = this.calculateDistance(
        place1.lat, place1.lng,
        place2.lat, place2.lng
      );
      return nameSimilarity > 0.8 && distance < 100; // 100 meters
    }
    
    return nameSimilarity > 0.9;
  }

  calculateStringSimilarity(str1, str2) {
    // Simple similarity calculation using Levenshtein distance
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : (maxLen - matrix[str2.length][str1.length]) / maxLen;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula for calculating distance between two points
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async addTodoPlace(place) {
    // Check if place already exists
    const exists = this.todoPlaces.find(p => 
      p.placeId === place.placeId || 
      this.isSimilarPlace(p, place)
    );

    if (!exists) {
      this.todoPlaces.push({
        ...place,
        addedAt: new Date().toISOString(),
        id: this.generateId()
      });
      await this.saveData();
    }
  }

  async markAsVisited(placeId) {
    const todoIndex = this.todoPlaces.findIndex(p => p.id === placeId || p.placeId === placeId);
    
    if (todoIndex !== -1) {
      const place = this.todoPlaces[todoIndex];
      
      // Move to visited list
      this.visitedPlaces.push({
        ...place,
        visitedAt: new Date().toISOString()
      });
      
      // Remove from todo list
      this.todoPlaces.splice(todoIndex, 1);
      
      await this.saveData();
    }
  }

  async removeTodoPlace(placeId) {
    const index = this.todoPlaces.findIndex(p => p.id === placeId || p.placeId === placeId);
    if (index !== -1) {
      this.todoPlaces.splice(index, 1);
      await this.saveData();
    }
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveData();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize the data manager
const placeDataManager = new PlaceDataManager();