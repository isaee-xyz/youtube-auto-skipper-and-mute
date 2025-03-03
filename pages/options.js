/**
 * YouTube Viewing Enhancer
 * Author: Isaee (twinklegarg008@gmail.com)
 * Options page script - manages settings UI
 */

class ViewerSettings extends HTMLElement {
    constructor() {
      super();
      this._state = {
        page: "home",
        pageData: {}
      };
      
      this.attachShadow({ mode: 'open' });
      this.render();
    }
    
    async connectedCallback() {
      this.setupPageListener();
      const { page, pageData } = await this.getPageState();
      this.state = { page, pageData };
    }
    
    setupPageListener() {
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.current_page && changes.current_page.newValue) {
          this.getPageState().then(({ page, pageData }) => {
            this.state = { page, pageData };
          });
        }
      });
    }
    
    async getPageState() {
      const { current_page, page_data } = await chrome.storage.local.get([
        "current_page", 
        "page_data"
      ]);
      
      if (!current_page) {
        return {
          page: this.state.page,
          pageData: this.state.pageData
        };
      }
      
      await chrome.storage.local.remove(["current_page", "page_data"]);
      return { page: current_page, pageData: page_data || {} };
    }
    
    get state() {
      return this._state;
    }
    
    set state(newState) {
      this._state = { ...this._state, ...newState };
      this.render();
    }
    
    async getSettings() {
      const { viewer_settings } = await chrome.storage.local.get("viewer_settings");
      return viewer_settings || {
        global: {
          enhanceDelay: 5,
          reduceVolume: true,
          active: true
        },
        creators: {}
      };
    }
    
    async saveSettings(settings) {
      // Generate fingerprint for integrity check
      const fingerprint = this.generateFingerprint(settings);
      
      await chrome.storage.local.set({ 
        viewer_settings: settings,
        settings_fingerprint: fingerprint
      });
    }
    
    // Simple hash function for fingerprinting
    generateFingerprint(obj) {
      const str = JSON.stringify(obj);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(16);
    }
    
    render() {
      if (this.state.page === "creator") {
        this.renderCreatorPage();
      } else {
        this.renderHomePage();
      }
    }
    
    async renderHomePage() {
      const settings = await this.getSettings();
      
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            --bg-color: #f8f9fa;
            --text-color: #202124;
            --card-bg: white;
            --border-color: #dadce0;
            --accent-color: #065fd4;
          }
          
          @media (prefers-color-scheme: dark) {
            :host {
              --bg-color: #202124;
              --text-color: #e8eaed;
              --card-bg: #303134;
              --border-color: #3c4043;
              --accent-color: #8ab4f8;
            }
          }
          
          .container {
            background-color: var(--bg-color);
            color: var(--text-color);
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
          }
          
          h1, h2 {
            margin-bottom: 15px;
          }
          
          .card {
            background-color: var(--card-bg);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          
          .setting-row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
          }
          
          .setting-label {
            flex: 1;
          }
          
          input[type="checkbox"] {
            transform: scale(1.2);
          }
          
          input[type="number"] {
            width: 60px;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background: var(--bg-color);
            color: var(--text-color);
          }
          
          .description {
            margin-top: 5px;
            font-size: 0.8em;
            opacity: 0.7;
          }
          
          .creator-list {
            list-style: none;
            padding: 0;
          }
          
          .creator-item {
            display: flex;
            align-items: center;
            padding: 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.2s;
          }
          
          .creator-item:hover {
            background-color: rgba(128, 128, 128, 0.1);
          }
          
          .creator-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 15px;
            object-fit: cover;
          }
          
          .creator-name {
            flex: 1;
          }
          
          .remove-btn {
            background: rgba(255, 77, 77, 0.9);
            color: white;
            border: none;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            font-size: 14px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
          }
          
          .creator-item:hover .remove-btn {
            opacity: 1;
          }
          
          .version-info {
            text-align: center;
            font-size: 12px;
            opacity: 0.6;
            margin-top: 20px;
          }
        </style>
        
        <div class="container">
          <h1>YouTube Viewing Enhancer</h1>
          
          <div class="card">
            <h2>Global Settings</h2>
            <div class="setting-row">
              <div class="setting-label">
                <div>Enable Enhancement</div>
                <div class="description">Turn the viewing enhancements on or off globally</div>
              </div>
              <input type="checkbox" id="global-active" ${settings.global.active ? 'checked' : ''}>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">
                <div>Reduce Volume During Promotions</div>
                <div class="description">Automatically lower volume when promotional content is playing</div>
              </div>
              <input type="checkbox" id="global-volume" ${settings.global.reduceVolume ? 'checked' : ''}>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">
                <div>Seconds before enhancing</div>
                <div class="description">Promotional content will play for this many seconds before enhancements are applied</div>
              </div>
              <input type="number" id="global-delay" min="0" max="30" value="${settings.global.enhanceDelay}">
            </div>
          </div>
          
          <div class="card">
            <h2>Creator-specific Settings</h2>
            <div class="description">
              Configure different enhancement settings for specific content creators.
              You can add creators while watching their videos on YouTube.
            </div>
            
            <ul class="creator-list" id="creator-list">
              ${Object.values(settings.creators).map(creator => `
                <li class="creator-item" data-creator-id="${creator.creatorId}">
                  <img src="${creator.avatarUrl}" class="creator-avatar" alt="${creator.creatorName}">
                  <div class="creator-name">${creator.creatorName}</div>
                  <button class="remove-btn" data-creator-id="${creator.creatorId}">×</button>
                </li>
              `).join('')}
            </ul>
            
            ${Object.keys(settings.creators).length === 0 ? 
              `<p>No creator configurations yet. You can add creator-specific settings while watching videos on YouTube.</p>` : 
              ''}
          </div>
          
          <div class="version-info">
            <p>Version 1.0.0 - YouTube Viewing Enhancer</p>
            <p>Created by Isaee (twinklegarg008@gmail.com)</p>
          </div>
        </div>
      `;
      
      // Add event listeners
      this.shadowRoot.querySelector('#global-active').addEventListener('change', async (e) => {
        const settings = await this.getSettings();
        settings.global.active = e.target.checked;
        await this.saveSettings(settings);
      });
      
      this.shadowRoot.querySelector('#global-volume').addEventListener('change', async (e) => {
        const settings = await this.getSettings();
        settings.global.reduceVolume = e.target.checked;
        await this.saveSettings(settings);
      });
      
      this.shadowRoot.querySelector('#global-delay').addEventListener('change', async (e) => {
        const value = parseInt(e.target.value);
        if (value < 0) e.target.value = 0;
        
        const settings = await this.getSettings();
        settings.global.enhanceDelay = parseInt(e.target.value);
        await this.saveSettings(settings);
      });
      
      // Creator list click handlers
      const creatorItems = this.shadowRoot.querySelectorAll('.creator-item');
      creatorItems.forEach(item => {
        item.addEventListener('click', () => {
          const creatorId = item.dataset.creatorId;
          this.navigateToCreatorPage(creatorId);
        });
      });
      
      // Remove button handlers
      const removeButtons = this.shadowRoot.querySelectorAll('.remove-btn');
      removeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
          e.stopPropagation();
          const creatorId = button.dataset.creatorId;
          const settings = await this.getSettings();
          
          if (creatorId in settings.creators) {
            delete settings.creators[creatorId];
            await this.saveSettings(settings);
            this.render();
          }
        });
      });
    }
    
    async navigateToCreatorPage(creatorId) {
      const settings = await this.getSettings();
      if (creatorId in settings.creators) {
        const creator = settings.creators[creatorId];
        this.state = {
          page: "creator",
          pageData: {
            creatorId: creator.creatorId,
            creatorName: creator.creatorName,
            avatarUrl: creator.avatarUrl
          }
        };
      }
    }
    
    async renderCreatorPage() {
      const { creatorId, creatorName, avatarUrl } = this.state.pageData;
      const settings = await this.getSettings();
      
      // Ensure creator exists in settings
      if (!(creatorId in settings.creators)) {
        settings.creators[creatorId] = {
          creatorId,
          creatorName,
          avatarUrl,
          enhanceDelay: settings.global.enhanceDelay,
          reduceVolume: settings.global.reduceVolume,
          active: settings.global.active
        };
        await this.saveSettings(settings);
      }
      
      const creatorSettings = settings.creators[creatorId];
      
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            --bg-color: #f8f9fa;
            --text-color: #202124;
            --card-bg: white;
            --border-color: #dadce0;
            --accent-color: #065fd4;
          }
          
          @media (prefers-color-scheme: dark) {
            :host {
              --bg-color: #202124;
              --text-color: #e8eaed;
              --card-bg: #303134;
              --border-color: #3c4043;
              --accent-color: #8ab4f8;
            }
          }
          
          .container {
            background-color: var(--bg-color);
            color: var(--text-color);
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
          }
          
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .back-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: var(--text-color);
            cursor: pointer;
            margin-right: 15px;
            padding: 0;
          }
          
          .creator-header {
            display: flex;
            align-items: center;
            flex: 1;
          }
          
          .creator-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-right: 15px;
            object-fit: cover;
          }
          
          .card {
            background-color: var(--card-bg);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          
          .setting-row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
          }
          
          .setting-label {
            flex: 1;
          }
          
          input[type="checkbox"] {
            transform: scale(1.2);
          }
          
          input[type="number"] {
            width: 60px;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background: var(--bg-color);
            color: var(--text-color);
          }
          
          .description {
            margin-top: 5px;
            font-size: 0.8em;
            opacity: 0.7;
          }
        </style>
        
        <div class="container">
          <div class="header">
            <button class="back-btn" id="back-btn">←</button>
            <div class="creator-header">
              <img src="${avatarUrl}" class="creator-avatar" alt="${creatorName}">
              <h2>${creatorName}</h2>
            </div>
          </div>
          
          <div class="card">
            <h3>Creator-specific Settings</h3>
            
            <div class="setting-row">
              <div class="setting-label">
                <div>Enable Enhancement for this Creator</div>
                <div class="description">Turn enhancements on or off for this specific creator</div>
              </div>
              <input type="checkbox" id="creator-active" ${creatorSettings.active ? 'checked' : ''}>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">
                <div>Reduce Volume for this Creator</div>
                <div class="description">Automatically lower volume during promotional content on this creator's videos</div>
              </div>
              <input type="checkbox" id="creator-volume" ${creatorSettings.reduceVolume ? 'checked' : ''}>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">
                <div>Seconds before enhancing</div>
                <div class="description">Promotional content will play for this many seconds before being enhanced on this creator's videos.
                  A longer time helps support the creator.</div>
              </div>
              <input type="number" id="creator-delay" min="0" max="30" value="${creatorSettings.enhanceDelay}">
            </div>
          </div>
        </div>
      `;
      
      // Add event listeners for back button
      this.shadowRoot.querySelector('#back-btn').addEventListener('click', () => {
        this.state = {
          page: "home",
          pageData: {}
        };
      });
      
      // Add event listeners for creator settings
      this.shadowRoot.querySelector('#creator-active').addEventListener('change', async (e) => {
        const settings = await this.getSettings();
        settings.creators[creatorId].active = e.target.checked;
        await this.saveSettings(settings);
      });
      
      this.shadowRoot.querySelector('#creator-volume').addEventListener('change', async (e) => {
        const settings = await this.getSettings();
        settings.creators[creatorId].reduceVolume = e.target.checked;
        await this.saveSettings(settings);
      });
      
      this.shadowRoot.querySelector('#creator-delay').addEventListener('change', async (e) => {
        const value = parseInt(e.target.value);
        if (value < 0) e.target.value = 0;
        
        const settings = await this.getSettings();
        settings.creators[creatorId].enhanceDelay = parseInt(e.target.value);
        await this.saveSettings(settings);
      });
    }
  }
  
  // Register the custom element
  customElements.define('viewer-settings', ViewerSettings);