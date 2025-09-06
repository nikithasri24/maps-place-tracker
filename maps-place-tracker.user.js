// ==UserScript==
// @name         Maps Place Tracker
// @namespace    https://github.com/nikithasri24/maps-place-tracker
// @version      1.0.0
// @description  Track your todo and visited places on Google Maps with smart prompts and visual indicators
// @author       Nikki
// @match        https://www.google.com/maps/*
// @match        https://maps.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/nikithasri24/maps-place-tracker/main/maps-place-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/nikithasri24/maps-place-tracker/main/maps-place-tracker.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Data Management Class
    class PlaceDataManager {
        constructor() {
            this.todoPlaces = this.loadTodoPlaces();
            this.visitedPlaces = this.loadVisitedPlaces();
            this.settings = this.loadSettings();
        }

        loadTodoPlaces() {
            const data = GM_getValue('todoPlaces', '[]');
            return JSON.parse(data);
        }

        loadVisitedPlaces() {
            const data = GM_getValue('visitedPlaces', '[]');
            return JSON.parse(data);
        }

        loadSettings() {
            const defaultSettings = {
                showVisited: true,
                autoPrompt: true,
                promptDelay: 2000
            };
            const data = GM_getValue('settings', JSON.stringify(defaultSettings));
            return { ...defaultSettings, ...JSON.parse(data) };
        }

        saveTodoPlaces() {
            GM_setValue('todoPlaces', JSON.stringify(this.todoPlaces));
        }

        saveVisitedPlaces() {
            GM_setValue('visitedPlaces', JSON.stringify(this.visitedPlaces));
        }

        saveSettings() {
            GM_setValue('settings', JSON.stringify(this.settings));
        }

        addTodoPlace(place) {
            const exists = this.todoPlaces.find(p => 
                p.placeId === place.placeId || this.isSimilarPlace(p, place)
            );
            if (!exists) {
                this.todoPlaces.push({
                    ...place,
                    addedAt: new Date().toISOString(),
                    id: this.generateId()
                });
                this.saveTodoPlaces();
                return true;
            }
            return false;
        }

        markAsVisited(placeId) {
            const todoIndex = this.todoPlaces.findIndex(p => p.id === placeId || p.placeId === placeId);
            if (todoIndex !== -1) {
                const place = this.todoPlaces[todoIndex];
                this.visitedPlaces.push({
                    ...place,
                    visitedAt: new Date().toISOString()
                });
                this.todoPlaces.splice(todoIndex, 1);
                this.saveTodoPlaces();
                this.saveVisitedPlaces();
                return true;
            }
            return false;
        }

        checkPlace(place) {
            const todoPlace = this.todoPlaces.find(p => 
                p.placeId === place.placeId || this.isSimilarPlace(p, place)
            );
            const visitedPlace = this.visitedPlaces.find(p => 
                p.placeId === place.placeId || this.isSimilarPlace(p, place)
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
            if (!place1.name || !place2.name) return false;
            const nameSimilarity = this.calculateStringSimilarity(
                place1.name.toLowerCase(), 
                place2.name.toLowerCase()
            );
            return nameSimilarity > 0.8;
        }

        calculateStringSimilarity(str1, str2) {
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

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        exportData() {
            return {
                todoPlaces: this.todoPlaces,
                visitedPlaces: this.visitedPlaces,
                settings: this.settings,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
        }

        clearAllData() {
            const keys = GM_listValues();
            keys.forEach(key => GM_deleteValue(key));
            this.todoPlaces = [];
            this.visitedPlaces = [];
            this.settings = this.loadSettings();
        }
    }

    // Main Maps Place Tracker Class
    class MapsPlaceTracker {
        constructor() {
            this.dataManager = new PlaceDataManager();
            this.currentPlace = null;
            this.isInitialized = false;
            this.observers = [];
            this.init();
        }

        async init() {
            console.log('🗺️ Maps Place Tracker UserScript initializing...');
            await this.waitForMapsToLoad();
            this.setupPlaceDetection();
            this.addControlsUI();
            this.addStyles();
            this.isInitialized = true;
            console.log('✅ Maps Place Tracker initialized successfully');
        }

        async waitForMapsToLoad() {
            return new Promise((resolve) => {
                const checkForMaps = () => {
                    const mapContainer = document.querySelector('#map') || 
                                       document.querySelector('[data-value="Map"]') ||
                                       document.querySelector('.widget-scene-canvas');
                    
                    if (mapContainer) {
                        setTimeout(resolve, 1000); // Give it a moment to fully load
                    } else {
                        setTimeout(checkForMaps, 1000);
                    }
                };
                checkForMaps();
            });
        }

        setupPlaceDetection() {
            this.watchUrlChanges();
            this.watchPlacePanel();
            setTimeout(() => this.checkCurrentPlace(), 2000);
        }

        watchUrlChanges() {
            let lastUrl = location.href;
            const urlObserver = new MutationObserver(() => {
                const currentUrl = location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    setTimeout(() => this.checkCurrentPlace(), 1500);
                }
            });
            
            urlObserver.observe(document, { 
                subtree: true, 
                childList: true 
            });
            
            this.observers.push(urlObserver);
        }

        watchPlacePanel() {
            const panelObserver = new MutationObserver(() => {
                this.checkCurrentPlace();
            });
            
            panelObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-value', 'aria-label']
            });
            
            this.observers.push(panelObserver);
        }

        checkCurrentPlace() {
            const placeInfo = this.extractPlaceInfo();
            
            if (placeInfo && (!this.currentPlace || this.currentPlace.name !== placeInfo.name)) {
                this.currentPlace = placeInfo;
                console.log('📍 New place detected:', placeInfo);
                this.handlePlaceDetection(placeInfo);
            }
        }

        extractPlaceInfo() {
            try {
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
                
                const urlMatch = location.href.match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/);
                let lat = null, lng = null;
                if (urlMatch) {
                    lat = parseFloat(urlMatch[1]);
                    lng = parseFloat(urlMatch[2]);
                }
                
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

        handlePlaceDetection(place) {
            const result = this.dataManager.checkPlace(place);
            this.updatePlaceIndicators(result.isTodo, result.isVisited);
            
            if (result.shouldPrompt) {
                setTimeout(() => {
                    this.showVisitedPrompt(place);
                }, this.dataManager.settings.promptDelay);
            }
        }

        updatePlaceIndicators(isTodo, isVisited) {
            const existingIndicators = document.querySelectorAll('.place-tracker-indicator');
            existingIndicators.forEach(el => el.remove());
            
            const nameElement = document.querySelector('h1[data-value="Place name"], h1[data-value], .DUwDvf.lfPIob');
            
            if (nameElement) {
                const indicator = document.createElement('div');
                indicator.className = 'place-tracker-indicator';
                
                if (isVisited) {
                    indicator.innerHTML = '✅ Visited';
                    indicator.style.background = '#e8f5e8';
                    indicator.style.color = '#2e7d32';
                } else if (isTodo) {
                    indicator.innerHTML = '📍 Todo';
                    indicator.style.background = '#fff3e0';
                    indicator.style.color = '#f57c00';
                }
                
                if (isVisited || isTodo) {
                    indicator.style.cssText += `
                        display: inline-block;
                        margin-left: 8px;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                        border: 1px solid currentColor;
                    `;
                    nameElement.appendChild(indicator);
                }
            }
        }

        showVisitedPrompt(place) {
            if (document.querySelector('.place-tracker-prompt-overlay')) return;
            
            const overlay = document.createElement('div');
            overlay.className = 'place-tracker-prompt-overlay';
            overlay.innerHTML = `
                <div class="place-tracker-prompt">
                    <h3>🗺️ Have you visited this place?</h3>
                    <p><strong>${this.escapeHtml(place.name)}</strong></p>
                    <p class="address">${this.escapeHtml(place.address || 'Address not available')}</p>
                    <div class="prompt-buttons">
                        <button class="btn-yes">✅ Yes, I've visited</button>
                        <button class="btn-no">❌ Not yet</button>
                        <button class="btn-cancel">Cancel</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            overlay.querySelector('.btn-yes').addEventListener('click', () => {
                this.markAsVisited(place);
                overlay.remove();
            });
            
            overlay.querySelector('.btn-no').addEventListener('click', () => {
                overlay.remove();
            });
            
            overlay.querySelector('.btn-cancel').addEventListener('click', () => {
                overlay.remove();
            });
            
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 30000);
        }

        markAsVisited(place) {
            const success = this.dataManager.markAsVisited(place.placeId || place.name);
            if (success) {
                this.updatePlaceIndicators(false, true);
                this.showNotification('✅ Marked as visited!', 'success');
            }
        }

        addToTodo(place) {
            const success = this.dataManager.addTodoPlace(place);
            if (success) {
                this.updatePlaceIndicators(true, false);
                this.showNotification('📍 Added to todo list!', 'success');
            } else {
                this.showNotification('ℹ️ Place already in todo list', 'info');
            }
        }

        addControlsUI() {
            const controls = document.createElement('div');
            controls.className = 'place-tracker-controls';
            controls.innerHTML = `
                <div class="controls-header">
                    <span>🗺️ Place Tracker</span>
                    <button class="toggle-btn">📍</button>
                </div>
                <div class="controls-body" style="display: none;">
                    <button class="add-todo-btn">📝 Add to Todo</button>
                    <button class="mark-visited-btn">✅ Mark Visited</button>
                    <button class="manage-btn">⚙️ Manage Lists</button>
                    <button class="export-btn">📤 Export Data</button>
                </div>
            `;
            
            document.body.appendChild(controls);
            
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
            
            controls.querySelector('.manage-btn').addEventListener('click', () => {
                this.showManagementModal();
            });
            
            controls.querySelector('.export-btn').addEventListener('click', () => {
                this.exportData();
            });
        }

        showManagementModal() {
            if (document.querySelector('.place-tracker-modal')) return;
            
            const modal = document.createElement('div');
            modal.className = 'place-tracker-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>🗺️ Manage Places</h2>
                        <button class="close-btn">✕</button>
                    </div>
                    <div class="modal-tabs">
                        <button class="tab-btn active" data-tab="todo">📝 Todo (${this.dataManager.todoPlaces.length})</button>
                        <button class="tab-btn" data-tab="visited">✅ Visited (${this.dataManager.visitedPlaces.length})</button>
                    </div>
                    <div class="modal-body">
                        <div class="tab-content active" id="todo-content">
                            ${this.renderPlaceList(this.dataManager.todoPlaces, 'todo')}
                        </div>
                        <div class="tab-content" id="visited-content">
                            ${this.renderPlaceList(this.dataManager.visitedPlaces, 'visited')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="clear-all-btn">🗑️ Clear All Data</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners
            modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            modal.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    modal.querySelector(`#${btn.dataset.tab}-content`).classList.add('active');
                });
            });
            
            modal.querySelector('.clear-all-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                    this.dataManager.clearAllData();
                    modal.remove();
                    this.showNotification('🗑️ All data cleared', 'info');
                }
            });
        }

        renderPlaceList(places, type) {
            if (places.length === 0) {
                return `<div class="empty-state">No ${type} places yet</div>`;
            }
            
            return places.map(place => `
                <div class="place-item">
                    <div class="place-name">${this.escapeHtml(place.name)}</div>
                    <div class="place-address">${this.escapeHtml(place.address || 'Address not available')}</div>
                    <div class="place-date">${type === 'visited' ? 'Visited' : 'Added'} ${this.formatDate(place.visitedAt || place.addedAt)}</div>
                </div>
            `).join('');
        }

        exportData() {
            const data = this.dataManager.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `maps-place-tracker-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('📤 Data exported!', 'success');
        }

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `place-tracker-notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }

        formatDate(dateString) {
            if (!dateString) return 'Unknown';
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'today';
            if (diffDays === 1) return 'yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            return date.toLocaleDateString();
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .place-tracker-controls {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    font-family: 'Google Sans', Arial, sans-serif;
                    min-width: 200px;
                }
                
                .controls-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #4285f4, #34a853);
                    color: white;
                    border-radius: 12px 12px 0 0;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .controls-header .toggle-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 4px;
                    border-radius: 4px;
                }
                
                .controls-body {
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .controls-body button {
                    background: #f8f9fa;
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    padding: 10px 12px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    color: #3c4043;
                    transition: all 0.2s ease;
                }
                
                .controls-body button:hover {
                    background: #e8f0fe;
                    border-color: #4285f4;
                    color: #1a73e8;
                }
                
                .place-tracker-prompt-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10001;
                }
                
                .place-tracker-prompt {
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
                    font-family: 'Google Sans', Arial, sans-serif;
                }
                
                .place-tracker-prompt h3 {
                    margin: 0 0 16px 0;
                    color: #202124;
                    font-size: 18px;
                }
                
                .place-tracker-prompt p {
                    margin: 8px 0;
                    color: #5f6368;
                    font-size: 14px;
                }
                
                .place-tracker-prompt p:first-of-type {
                    font-weight: 500;
                    color: #202124;
                    font-size: 16px;
                }
                
                .prompt-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }
                
                .prompt-buttons button {
                    padding: 10px 16px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    flex: 1;
                }
                
                .btn-yes {
                    background: #34a853;
                    color: white;
                }
                
                .btn-no {
                    background: #ea4335;
                    color: white;
                }
                
                .btn-cancel {
                    background: #f8f9fa;
                    color: #5f6368;
                    border: 1px solid #dadce0;
                }
                
                .place-tracker-notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #202124;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    z-index: 10002;
                    font-family: 'Google Sans', Arial, sans-serif;
                }
                
                .place-tracker-notification.success {
                    background: #34a853;
                }
                
                .place-tracker-notification.info {
                    background: #4285f4;
                }
                
                .place-tracker-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10001;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Google Sans', Arial, sans-serif;
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #5f6368;
                }
                
                .modal-tabs {
                    display: flex;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .modal-tabs .tab-btn {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                }
                
                .modal-tabs .tab-btn.active {
                    border-bottom-color: #4285f4;
                    color: #4285f4;
                }
                
                .modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }
                
                .tab-content {
                    display: none;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                .place-item {
                    padding: 12px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                
                .place-name {
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                
                .place-address {
                    color: #5f6368;
                    font-size: 12px;
                    margin-bottom: 4px;
                }
                
                .place-date {
                    color: #80868b;
                    font-size: 11px;
                }
                
                .empty-state {
                    text-align: center;
                    color: #5f6368;
                    padding: 40px;
                }
                
                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #e0e0e0;
                }
                
                .clear-all-btn {
                    background: #fce8e6;
                    color: #ea4335;
                    border: 1px solid #f4b9b6;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                }
                
                @media (max-width: 480px) {
                    .place-tracker-controls {
                        right: 10px;
                        top: 10px;
                        min-width: 180px;
                    }
                    .modal-content {
                        width: 95%;
                        margin: 20px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Initialize when the script loads
    if (window.location.hostname.includes('google.com') && 
        (window.location.pathname.includes('/maps') || window.location.search.includes('maps'))) {
        
        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => new MapsPlaceTracker(), 2000);
            });
        } else {
            setTimeout(() => new MapsPlaceTracker(), 2000);
        }
    }

})();