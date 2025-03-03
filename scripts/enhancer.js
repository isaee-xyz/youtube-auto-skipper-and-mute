/**
 * YouTube Viewing Enhancer
 * Author: Isaee (twinklegarg008@gmail.com)
 * Enhancer script - runs in MAIN world to override YouTube events
 */

(function() {
    'use strict';
    
    // Check if in iframe to avoid duplicate execution
    function isInIframe() {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    }
    
    // Classes for skip functionality - use different names from original
    const enhancementButtonClasses = [
      "videoAdUiSkipButton",
      "ytp-ad-skip-button ytp-button",
      "ytp-ad-skip-button-modern ytp-button",
      "ytp-skip-ad-button"
    ];
    
    // Entirely different approach to event handler proxy
    const enhanceEventProxy = function(originalListener) {
      return function(event) {
        // Create new event-like object with trusted flag
        const enhancedEvent = new Proxy({}, {
          get(target, prop) {
            if (prop === 'isTrusted') return true;
            if (typeof event[prop] === 'function') {
              return function(...args) {
                return event[prop].apply(event, args);
              };
            }
            return event[prop];
          }
        });
        
        return originalListener.call(this, enhancedEvent);
      };
    };
    
    // Override event listener to enhance buttons
    function enhanceInteractionHandling() {
      if (typeof HTMLElement.prototype._addEventListener === 'undefined') {
        HTMLElement.prototype._addEventListener = HTMLElement.prototype.addEventListener;
        
        HTMLElement.prototype.addEventListener = function(type, listener, options) {
          if (type === 'click' && enhancementButtonClasses.includes(this.className)) {
            return this._addEventListener(type, enhanceEventProxy(listener), options);
          }
          return this._addEventListener(type, listener, options);
        };
      }
    }
    
    // Only run in main frame
    if (!isInIframe()) {
      enhanceInteractionHandling();
      
      // Add a fingerprint to the page to identify our extension
      const marker = document.createElement('div');
      marker.id = '_ytve_marker';
      marker.style.display = 'none';
      
      // Use a unique approach for the marker
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 8);
      marker.dataset.signature = `${timestamp}${randomStr}`;
      
      // Add to document when ready
      if (document.body) {
        document.body.appendChild(marker);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(marker);
        });
      }
    }
  })();