/**
 * YouTube Viewing Enhancer
 * Author: Isaee (twinklegarg008@gmail.com)
 * Content script - handles ad detection and enhancement
 */

(function() {
    'use strict';
    
    // Constants with different naming
    const ACTIONS = {
      CONFIGURE_CREATOR: "configure_creator",
      BACK_TO_HOME: "back_to_home"
    };
    
    // Unique implementation of isInFrame
    function isInEmbeddedContext() {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    }
    
    // Unique implementation of click simulation
    function simulateInteraction(element) {
      if (!element) return;
      
      // Create a MouseEvent instead of using createEvent
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      
      element.dispatchEvent(clickEvent);
    }
    
    // Get elements by multiple class names - different implementation
    function queryMultipleClasses(classArray) {
      let results = [];
      
      for (const className of classArray) {
        const elements = document.getElementsByClassName(className);
        if (elements && elements.length) {
          results = results.concat(Array.from(elements));
        }
      }
      
      return results;
    }
    
    // Unique logging implementation
    const log = {
      info: (...args) => {
        // console.log("[YT-View-Enhancer]", ...args);
      },
      error: (...args) => console.error("[YT-View-Enhancer]", ...args),
      warn: (...args) => console.warn("[YT-View-Enhancer]", ...args)
    };
    
    // Unique implementation of the interval loop
    function createObserverLoop(callback, interval) {
      let running = true;
      
      const execute = async () => {
        if (!running) return;
        
        try {
          await callback();
        } catch (e) {
          log.error("Observer error:", e);
        }
        
        setTimeout(execute, interval);
      };
      
      execute();
      
      return {
        stop: () => { running = false; }
      };
    }
    
    // Default settings - different structure
    const DEFAULT_SETTINGS = {
      global: {
        enhanceDelay: 5,
        reduceVolume: true,
        active: true
      },
      creators: {}
    };
    
    // Get settings with a unique key
    async function getViewerSettings() {
      const { viewer_settings } = await chrome.storage.local.get("viewer_settings");
      return viewer_settings || DEFAULT_SETTINGS;
    }
    
    // Get creator-specific delay setting
    async function getEnhancementDelay(creatorId) {
      const settings = await getViewerSettings();
      
      if (creatorId && creatorId in settings.creators) {
        return settings.creators[creatorId].enhanceDelay;
      }
      
      return settings.global.enhanceDelay;
    }
    
    // Get creator-specific volume setting
    async function getVolumePreference(creatorId) {
      const settings = await getViewerSettings();
      
      if (creatorId && creatorId in settings.creators) {
        return settings.creators[creatorId].reduceVolume;
      }
      
      return settings.global.reduceVolume;
    }
    
    // Check if enhancement is active
    async function isEnhancementActive(creatorId) {
      const settings = await getViewerSettings();
      
      if (creatorId && creatorId in settings.creators) {
        return settings.creators[creatorId].active;
      }
      
      return settings.global.active;
    }
    
    // Add time to date - unique implementation
    function addTimeOffset(time) {
      const targetTime = new Date();
      targetTime.setMilliseconds(targetTime.getMilliseconds() + time);
      return targetTime;
    }
    
    // Define custom events
    const ViewEvents = {
      tick: "observer_tick",
      promotionStarted: "promotion_started",
      promotionChanged: "promotion_changed",
      promotionEnded: "promotion_ended",
      pageChanged: "page_changed"
    };
    
    // Observer setup
    const eventTypes = Object.values(ViewEvents);
    const eventSubscribers = eventTypes.reduce((acc, type) => ({...acc, [type]: []}), {});
    
    // More robust ad detection to prevent false positives
    function isPromotionalContent() {
      // Check multiple ad indicators to ensure we only detect actual ads
      const adIndicators = [
        // Ad badge or label
        Boolean(document.querySelector(".ytp-ad-badge")),
        
        // "Ad" text or icon visible in player
        Boolean(document.querySelector('[class*="ad-showing"]')),
        Boolean(document.querySelector('[class*="ad-interrupting"]')),
        
        // Ad information button
        Boolean(document.querySelector(".ytp-ad-info-dialog-btn")),
        
        // Ad visit button
        Boolean(document.querySelector(".ytp-ad-visit-advertiser-button")),
        Boolean(document.querySelector(".ytp-visit-advertiser-link")),
        
        // Check for "Skip Ad" button 
        Boolean(document.querySelector(".ytp-ad-skip-button")),
        Boolean(document.querySelector(".ytp-ad-skip-button-modern")),
        Boolean(document.querySelector(".videoAdUiSkipButton"))
      ];
      
      // Only return true if we have at least two indicators
      // This prevents false positives from misidentifying regular videos as ads
      return adIndicators.filter(Boolean).length >= 2;
    }
    
    // Start the main observation loop
    function startObserver() {
      let currentPromotion;
      let currentPage = document.location.href;
      
      return createObserverLoop(async () => {
        const nextPage = document.location.href;
        
        // Enhanced ad detection with multiple factors
        function detectAdState() {
          // Multiple indicators that an ad is playing
          const adBadge = document.querySelector(".ytp-ad-badge");
          const adShowingClass = document.querySelector('[class*="ad-showing"]');
          const adInfoButton = document.querySelector(".ytp-ad-info-dialog-btn");
          const adVisitButton = document.querySelector(".ytp-ad-visit-advertiser-button");
          const visitorLink = document.querySelector(".ytp-visit-advertiser-link");
          const skipButton = document.querySelector(".ytp-ad-skip-button") || 
                             document.querySelector(".ytp-ad-skip-button-modern") ||
                             document.querySelector(".videoAdUiSkipButton");
          
          // Count how many indicators are present
          const adSignals = [
            Boolean(adBadge),
            Boolean(adShowingClass),
            Boolean(adInfoButton), 
            Boolean(adVisitButton),
            Boolean(visitorLink),
            Boolean(skipButton)
          ].filter(Boolean).length;
          
          // Only report an ad if we have at least 2 indicators
          // This prevents false positives
          if (adSignals >= 2) {
            // Return a description of the ad
            return adVisitButton?.getAttribute("aria-label") || 
                   visitorLink?.getAttribute("aria-label") || 
                   adBadge?.textContent ||
                   "Promotional content detected";
          }
          
          return undefined;
        }
        
        // Use the enhanced detection
        const promoActive = detectAdState();
        
        const eventsToTrigger = [];
        
        // Compare states
        if (currentPage !== nextPage) {
          eventsToTrigger.push(ViewEvents.pageChanged);
          currentPage = nextPage;
        }
        
        if (currentPromotion !== promoActive) {
          if (promoActive) {
            eventsToTrigger.push(ViewEvents.promotionStarted);
          }
          
          if (currentPromotion && promoActive) {
            eventsToTrigger.push(ViewEvents.promotionChanged);
          }
          
          if (currentPromotion && !promoActive) {
            eventsToTrigger.push(ViewEvents.promotionEnded);
          }
          
          currentPromotion = promoActive;
        }
        
        // Regular tick event
        eventsToTrigger.push(ViewEvents.tick);
        
        // Dispatch events to subscribers
        for (const event of eventsToTrigger) {
          const subscribers = eventSubscribers[event] || [];
          
          for (const callback of subscribers) {
            try {
              callback({
                previous: { promotion: currentPromotion, page: currentPage },
                current: { promotion: promoActive, page: nextPage }
              });
            } catch (error) {
              log.error(`Error in ${event} handler:`, error);
            }
          }
        }
      }, 200);
    }
    
    // Observer API
    const ViewObserver = {
      isRunning: false,
      observerInstance: null,
      
      start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.observerInstance = startObserver();
      },
      
      subscribe(eventType, callback) {
        if (!eventTypes.includes(eventType)) return;
        
        eventSubscribers[eventType].push(callback);
      }
    };
    
    // Check if video is currently muted
    function isVideoSoundOff() {
      const volumeIndicator = document.querySelector(".ytp-volume-slider-handle");
      const volumePosition = volumeIndicator ? parseInt(volumeIndicator.style.left || "0") : 0;
      return volumePosition === 0;
    }
    
    // Enhancement button class names
    const enhancementButtonClasses = [
      "videoAdUiSkipButton",
      "ytp-ad-skip-button ytp-button",
      "ytp-ad-skip-button-modern ytp-button",
      "ytp-skip-ad-button"
    ];
    
    // Activate enhancement buttons
    function activateEnhancementButtons() {
      const buttons = queryMultipleClasses(enhancementButtonClasses);
      buttons.forEach(button => simulateInteraction(button));
    }
    
    // Toggle sound
    function toggleSound() {
      const soundButton = document.querySelector(".ytp-mute-button");
      if (soundButton) {
        simulateInteraction(soundButton);
      }
    }
    
    // Get creator information
    function getCreatorInfo() {
      const creatorLink = document.querySelector("ytd-video-owner-renderer ytd-channel-name a");
      
      if (!creatorLink) {
        return {
          creatorId: "",
          creatorName: "",
          avatarUrl: ""
        };
      }
      
      const creatorName = creatorLink.innerText;
      const creatorId = creatorLink.href.split("/").pop() || "";
      const avatarUrl = document.querySelector("ytd-video-owner-renderer img")?.src || "";
      
      return {
        creatorId,
        creatorName,
        avatarUrl
      };
    }
    
    // Check if on video page
    function isVideoContent() {
      return document.location.pathname === "/watch";
    }
    
    // Safety timeout function - prevents any enhancement actions after a certain time
    // This prevents accidentally affecting the main video
    function createSafetyTimeout(callback, timeLimit = 30000) {
      const timeoutId = setTimeout(() => {
        // Force cleanup if enhancement has been pending too long
        // This prevents affecting the main video if an ad was misdetected
        callback();
      }, timeLimit);
      
      return {
        clear: () => clearTimeout(timeoutId)
      };
    }
    
    // Track video changes to prevent false actions
    let lastVideoUrl = '';
    let lastVideoTime = 0;
  
    function detectVideoChange() {
      const videoElement = document.querySelector('video');
      const currentUrl = window.location.href;
      
      if (!videoElement) return false;
      
      // Check if URL changed or if video time suddenly jumped backward
      // (which could indicate a new video or ad insertion)
      const currentTime = videoElement.currentTime;
      const urlChanged = currentUrl !== lastVideoUrl;
      const timeJumped = lastVideoTime > 0 && 
                        currentTime < lastVideoTime && 
                        (lastVideoTime - currentTime) > 3;
                        
      lastVideoUrl = currentUrl;
      lastVideoTime = currentTime;
      
      return urlChanged || timeJumped;
    }
    
    // Enhancement Scheduler
    class ViewingEnhancer {
      constructor() {
        this.scheduledTime = null;
        this.countdownElement = null;
        this.safetyTimeout = null;
        this.lastCheckedState = null;
      }
      
      setupObservers() {
        ViewObserver.subscribe(ViewEvents.promotionStarted, () => this.scheduleEnhancement());
        ViewObserver.subscribe(ViewEvents.promotionEnded, () => this.cleanupEnhancement());
        ViewObserver.subscribe(ViewEvents.tick, () => this.checkSchedule());
      }
      
      cleanup() {
        this.scheduledTime = null;
        if (this.countdownElement) {
          this.countdownElement.remove();
          this.countdownElement = null;
        }
        
        // Clear any pending safety timeout
        if (this.safetyTimeout) {
          this.safetyTimeout.clear();
          this.safetyTimeout = null;
        }
      }
      
      async scheduleEnhancement() {
        try {
          // First check if this is actually an ad with multiple indicators
          if (!isPromotionalContent()) {
            this.cleanup();
            return;
          }
          
          const { creatorId } = getCreatorInfo();
          
          // Check if enhancement is active for this creator
          const isActive = await isEnhancementActive(creatorId);
          if (!isActive) {
            this.cleanup();
            return;
          }
          
          // Get delay setting
          const delay = await getEnhancementDelay(creatorId);
          if (delay < 0) {
            this.cleanup();
            return;
          }
          
          // Schedule enhancement
          this.scheduledTime = addTimeOffset(delay * 1000);
          log.info("Enhancement scheduled for", this.scheduledTime);
          
          // Set a safety timeout that will force cleanup after 30 seconds max
          // This prevents accidentally affecting the main video
          this.safetyTimeout = createSafetyTimeout(() => {
            log.warn("Safety timeout triggered - forcing cleanup");
            this.cleanup();
          });
          
          this.renderCountdown();
        } catch (error) {
          log.error("Error in scheduleEnhancement:", error);
          this.cleanup();
        }
      }
      
      renderCountdown() {
        if (!this.scheduledTime) {
          if (this.countdownElement) {
            this.countdownElement.remove();
            this.countdownElement = null;
          }
          return;
        }
        
        const remainingSeconds = Math.max(0, Math.floor(
          (this.scheduledTime.getTime() - new Date().getTime()) / 1000
        ));
        
        // Create or update countdown element
        if (!this.countdownElement) {
          this.countdownElement = document.createElement("div");
          this.countdownElement.id = "view_enhance_countdown";
          this.countdownElement.style.margin = "10px 0";
          this.countdownElement.style.color = "var(--yt-spec-text-primary)";
          
          const container = document.querySelector("ytd-video-primary-info-renderer #container");
          if (container) {
            container.insertAdjacentElement("afterbegin", this.countdownElement);
          }
        }
        
        // Update content
        this.countdownElement.innerHTML = `
          <span>Content will be enhanced in ${remainingSeconds} seconds. </span>
          <a href="#" style="color: inherit; text-decoration: none; border-bottom: 1px solid;">
            Click here to cancel enhancement
          </a>
        `;
        
        // Add cancel handler
        const cancelLink = this.countdownElement.querySelector("a");
        if (cancelLink) {
          cancelLink.onclick = (e) => {
            e.preventDefault();
            this.cleanup();
            return false;
          };
        }
      }
      
      checkSchedule() {
        try {
          this.renderCountdown();
          
          if (!this.scheduledTime) {
            return;
          }
          
          // Store current state to detect rapid changes
          const currentState = isPromotionalContent();
          
          // If state flipped from ad to non-ad between checks, abort enhancement
          if (this.lastCheckedState === true && currentState === false) {
            log.info("Ad state changed - aborting enhancement");
            this.cleanup();
            return;
          }
          
          this.lastCheckedState = currentState;
          
          if (this.scheduledTime <= new Date()) {
            // Final verification that we're still on an ad before enhancing
            if (isPromotionalContent()) {
              // Verify we have actual enhancement buttons to click
              const buttons = queryMultipleClasses(enhancementButtonClasses);
              if (buttons && buttons.length > 0) {
                activateEnhancementButtons();
              } else {
                log.warn("No enhancement buttons found even though ad detected");
              }
            } else {
              log.info("Not an ad at enhancement time - aborting");
            }
            this.cleanup();
          }
        } catch (error) {
          log.error("Error in checkSchedule:", error);
          this.cleanup();
        }
      }
      
      cleanupEnhancement() {
        this.cleanup();
      }
    }
    
    // Volume Manager
    class VolumeManager {
      setupObservers() {
        ViewObserver.subscribe(ViewEvents.promotionStarted, () => this.handlePromotionStart());
        ViewObserver.subscribe(ViewEvents.promotionEnded, () => this.restoreVolume());
      }
      
      async handlePromotionStart() {
        // Double-check that this is actually an ad
        if (!isPromotionalContent() || isVideoSoundOff()) {
          return;
        }
        
        const { creatorId } = getCreatorInfo();
        
        // Check if enhancement is active
        const isActive = await isEnhancementActive(creatorId);
        if (!isActive) {
          return;
        }
        
        // Check volume preference
        const shouldReduce = await getVolumePreference(creatorId);
        if (shouldReduce) {
          toggleSound();
        }
      }
      
      restoreVolume() {
        if (isVideoSoundOff()) {
          toggleSound();
        }
      }
    }
    
    // Creator Configuration Button
    class CreatorConfigButton {
      constructor() {
        this.hasAttempted = false;
      }
      
      setupObservers() {
        ViewObserver.subscribe(ViewEvents.pageChanged, () => {
          this.handlePageChange();
        });
        
        ViewObserver.subscribe(ViewEvents.tick, () => {
          if (!this.hasConfigButton()) {
            this.hasAttempted = false;
            this.createConfigButton();
          }
        });
        
        this.createConfigButton();
      }
      
      handlePageChange() {
        if (!isVideoContent()) {
          return;
        }
        
        this.createConfigButton();
      }
      
      hasConfigButton() {
        return !!document.querySelector("#creator_config_button");
      }
      
      createConfigButton() {
        if (this.hasConfigButton() || this.hasAttempted) {
          return;
        }
        
        this.hasAttempted = true;
        
        const container = document.querySelector("#related");
        if (!container) {
          return;
        }
        
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.alignItems = "center";
        buttonContainer.style.justifyContent = "center";
        buttonContainer.style.marginBottom = "1em";
        
        const button = document.createElement("a");
        button.id = "creator_config_button";
        button.title = "Configure viewing experience for this creator";
        button.innerHTML = `Configure viewing preferences for this creator`;
        button.style.lineHeight = "1.5em";
        button.style.cursor = "pointer";
        button.style.fontSize = "1.2em";
        button.style.color = "var(--yt-spec-text-primary, black)";
        button.style.borderBottom = "1px solid var(--yt-spec-text-primary, black)";
        
        button.onclick = () => {
          const creatorInfo = getCreatorInfo();
          chrome.runtime.sendMessage({
            action: ACTIONS.CONFIGURE_CREATOR,
            creator: creatorInfo
          });
        };
        
        buttonContainer.appendChild(button);
        container.insertAdjacentElement("beforebegin", buttonContainer);
      }
    }
    
    // Overlay Cleanup
    class OverlayManager {
      setupObservers() {
        ViewObserver.subscribe(ViewEvents.tick, () => {
          this.removeOverlays();
        });
      }
      
      removeOverlays() {
        const overlayCloseButtons = document.querySelectorAll(".ytp-ad-overlay-close-button");
        overlayCloseButtons.forEach(button => simulateInteraction(button));
      }
    }
    
    // Initialize everything
    function initialize() {
      if (isInEmbeddedContext()) {
        return;
      }
      
      // Verify extension state
      chrome.runtime.sendMessage({ action: "verify_integrity" }, response => {
        if (!response || !response.isValid) {
          log.warn("Extension state validation failed");
          return;
        }
        
        // Start observer
        ViewObserver.start();
        
        // Initialize components
        new ViewingEnhancer().setupObservers();
        new VolumeManager().setupObservers();
        new CreatorConfigButton().setupObservers();
        new OverlayManager().setupObservers();
        
        // Setup video change detection
        ViewObserver.subscribe(ViewEvents.tick, () => {
          if (detectVideoChange()) {
            // Force cleanup of any pending enhancements when video changes
            const enhancer = new ViewingEnhancer();
            enhancer.cleanup();
          }
        });
      });
    }
    
    // Call initialize function to start the extension
    initialize();
  })();