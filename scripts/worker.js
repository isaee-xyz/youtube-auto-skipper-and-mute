/**
 * YouTube Viewing Enhancer
 * Author: Isaee (twinklegarg008@gmail.com)
 * Background service worker - handles settings and navigation
 */

const ACTIONS = {
    CONFIGURE_CREATOR: "configure_creator",
    BACK_TO_HOME: "back_to_home"
  };
  
  const STORAGE_KEYS = {
    CONFIG: "viewer_settings",
    PAGE: "current_page",
    PAGE_DATA: "page_data"
  };
  
  // Default settings
  const DEFAULT_SETTINGS = {
    global: {
      enhanceDelay: 5,
      reduceVolume: true,
      active: true
    },
    creators: {}
  };
  
  // Logging utility - more unique implementation
  const logUtil = {
    trace: (...data) => {
      // console.log("[YT-enhancer]", ...data);
    },
    issue: (...data) => console.error("[YT-enhancer]", ...data),
    alert: (...data) => console.warn("[YT-enhancer]", ...data)
  };
  
  // Get settings from storage with a unique key
  async function getSettings() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
    return data[STORAGE_KEYS.CONFIG] || DEFAULT_SETTINGS;
  }
  
  // Save settings to storage with a unique key
  async function saveSettings(settings) {
    await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: settings });
  }
  
  // Create a unique fingerprint of the settings object
  function createFingerprint(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  // Configure creator-specific settings
  function configureCreator({ creatorId, creatorName, avatarUrl }) {
    chrome.storage.local.set({
      [STORAGE_KEYS.PAGE]: "creator",
      [STORAGE_KEYS.PAGE_DATA]: {
        creatorId,
        creatorName,
        avatarUrl,
        timestamp: Date.now()
      }
    }).then(() => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Go back to main settings page
  function goToMainSettings() {
    chrome.storage.local.set({
      [STORAGE_KEYS.PAGE]: "home",
      [STORAGE_KEYS.PAGE_DATA]: {
        timestamp: Date.now()
      }
    }).then(() => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Store setting fingerprint for integrity verification
  async function updateSettingsFingerprint() {
    const settings = await getSettings();
    const fingerprint = createFingerprint(settings);
    await chrome.storage.local.set({ settings_fingerprint: fingerprint });
    return fingerprint;
  }
  
  // Verify settings integrity
  async function verifySettingsIntegrity() {
    const settings = await getSettings();
    const stored = await chrome.storage.local.get("settings_fingerprint");
    const currentFingerprint = createFingerprint(settings);
    
    if (stored.settings_fingerprint && stored.settings_fingerprint !== currentFingerprint) {
      logUtil.alert("Settings integrity check failed");
      // Reset to defaults if tampering detected
      await saveSettings(DEFAULT_SETTINGS);
      await updateSettingsFingerprint();
      return false;
    }
    return true;
  }
  
  // Message handler
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;
    
    switch (message.action) {
      case ACTIONS.CONFIGURE_CREATOR:
        configureCreator(message.creator);
        break;
      case ACTIONS.BACK_TO_HOME:
        goToMainSettings();
        break;
      case "verify_integrity":
        verifySettingsIntegrity().then(isValid => {
          sendResponse({ isValid });
        });
        return true; // Keep channel open for async response
    }
  });
  
  // When extension is installed
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      // Initialize with defaults and create fingerprint
      await saveSettings(DEFAULT_SETTINGS);
      await updateSettingsFingerprint();
      chrome.runtime.openOptionsPage();
    }
  });
  
  // Action button click
  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
  });