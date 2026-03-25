(function() {
  console.log("AI Receptionist Widget: Loading...");
  
  // Get the script tag that loaded this file
  const scriptTag = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  // Extract base URL from script src
  const scriptSrc = scriptTag ? scriptTag.src : "";
  let APP_URL = "";
  try {
    const url = new URL(scriptSrc);
    // Strip 'widget.js' from the path if it's there
    let path = url.pathname;
    if (path.endsWith('widget.js')) {
      path = path.substring(0, path.lastIndexOf('widget.js'));
    }
    APP_URL = url.origin + (path === '/' ? '' : path);
    if (APP_URL.endsWith('/')) APP_URL = APP_URL.slice(0, -1);
  } catch (e) {
    // Fallback if dynamic detection fails
    APP_URL = "https://ais-pre-fugulv26muqmpl4mt3qtx2-65767528401.asia-southeast1.run.app";
  }
  
  if (APP_URL.includes('-dev-')) {
    console.warn("AI Receptionist Widget: You are using a DEV URL. This may cause redirect issues (302) due to platform security checks. Please use the SHARED APP URL (ais-pre-...) for production embedding.");
  }
  
  console.log("AI Receptionist Widget: APP_URL is", APP_URL);
  
  function init() {
    if (document.getElementById('ai-receptionist-widget-container')) return;

    console.log("AI Receptionist Widget: Initializing...");

    const botName = scriptTag ? scriptTag.getAttribute('data-bot-name') : "";
    const primaryColor = scriptTag ? scriptTag.getAttribute('data-primary-color') : "";

    // Create container
    const container = document.createElement('div');
    container.id = 'ai-receptionist-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '0';
    container.style.right = '0';
    container.style.zIndex = '999999';
    container.style.width = '100px'; // Start slightly larger to ensure button visibility
    container.style.height = '100px';
    container.style.pointerEvents = 'none'; // Allow clicking through the empty space
    document.body.appendChild(container);

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'ai-receptionist-widget-iframe';
    let src = APP_URL + "/widget?embedded=true";
    if (botName) src += "&botName=" + encodeURIComponent(botName);
    if (primaryColor) src += "&primaryColor=" + encodeURIComponent(primaryColor);
    
    console.log("AI Receptionist Widget: Setting iframe src to", src);
    
    iframe.src = src;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    iframe.style.pointerEvents = 'auto'; // Re-enable pointer events for the iframe content
    iframe.allow = "microphone; camera; geolocation";
    
    iframe.onload = function() {
      console.log("AI Receptionist Widget: Iframe loaded successfully.");
    };

    iframe.onerror = function() {
      console.error("AI Receptionist Widget: Iframe failed to load.");
    };
    
    container.appendChild(iframe);

    // Handle messages from widget (e.g. resizing)
    window.addEventListener('message', function(event) {
      // Check origin for security
      if (event.origin !== APP_URL) return;
      
      if (event.data.type === 'WIDGET_RESIZE') {
        container.style.width = event.data.width;
        container.style.height = event.data.height;
      }
    });
    
    console.log("AI Receptionist Widget: Ready.");
  }

  // Initialize when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init);
  }
})();
