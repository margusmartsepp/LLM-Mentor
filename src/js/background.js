chrome.runtime.onInstalled.addListener(() => {
    console.log("LLM Mentor sidebar installed.");
  });
let isSidebarOpen = true;

chrome.action.onClicked.addListener(() => {
  if (isSidebarOpen) {
    chrome.sidePanel.setOptions({ path: '' });
    isSidebarOpen = false;
  } else {
    chrome.sidePanel.setOptions({ path: 'sidebar.html' });
    isSidebarOpen = true;
  }
});
// Background service worker (background.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background:", message); 
  if (message.type === 'API_CALL') {
    fetch(message.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: message.model,
        messages: message.messages,
        max_tokens: message.max_tokens,
        temperature: message.temperature
      })
    })
    .then(response => response.json())
    .then(data => sendResponse({ success: true, data: data }))
    .catch(error => sendResponse({ success: false, error: error.message }));

    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});

