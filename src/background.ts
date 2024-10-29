// background.tsx
import {  ChromeMessage, APIResponse, HistoryItem, MemoryProfile, ApiRequest } from './types'; // Correct import


let lastRequest: ApiRequest | null = null;
let isSidebarOpen = true;


const normalizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};


const isRequestDuplicate = (current: ApiRequest, last: ApiRequest | null): boolean => {
  if (!last) return false;

  const currentPrompt = normalizeText(current.messages[current.messages.length - 1].content);
  const lastPrompt = normalizeText(last.messages[last.messages.length - 1].content);

  return currentPrompt === lastPrompt &&
    current.model === last.model &&
    current.maxTokens === last.maxTokens &&
    current.temperature === last.temperature &&
    current.url === last.url &&
    JSON.stringify(current.messages.slice(0, -1)) === JSON.stringify(last.messages.slice(0, -1));
};



const calculateAverageResponseTime = async (model: string, maxTokens: number): Promise<number> => {
  const result = await chrome.storage.local.get(['history']);
  const history = result.history || {};
  const relevantRequests: HistoryItem[] = Object.values(history).flat() as HistoryItem[];


  if (!relevantRequests || relevantRequests.length === 0) return 5; // Default expectation


  const totalTime = relevantRequests.reduce((acc, curr) => acc + curr.requestTime, 0);
  return totalTime / relevantRequests.length;
};



chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  console.log("Message received in background:", message);


  if (message.type === 'API_CALL') {
    const apiRequest: ApiRequest = {
        type: message.type,
        model: message.model || '',
        url: message.url || '',
        messages: message.messages || [],
        maxTokens: message.maxTokens,
        temperature: message.temperature,
        timestamp: new Date()
    };

    if (isRequestDuplicate(apiRequest, lastRequest)) {
      console.log("Duplicate request detected, returning cached response");
      if (lastRequest?.response) {
        sendResponse({ success: true, data: lastRequest.response, cached: true });
      } else {
        sendResponse({ success: false, error: 'Cached response not available' });
      }
      return true;
    }


    lastRequest = { ...apiRequest, response: null };
    const startTime = Date.now();

    if (!message.url) {
        sendResponse({ success: false, error: 'URL is required' });
        return true;
    }

    fetch(message.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: message.model,
        messages: message.messages,
        max_tokens: message.max_tokens,
        temperature: message.temperature
      })
    })
      .then(response => response.json())
      .then(data => {
        const requestTime = (Date.now() - startTime) / 1000;
        data.requestTime = requestTime;
        if (lastRequest) {
          lastRequest.response = data;
        }
        sendResponse({ success: true, data, cached: false });
      })
      .catch(error => {
        lastRequest = null;
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }


  if (message.type === 'SAVE_HISTORY') {
    const date = new Date(message.data.timestamp);
    const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;

    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || {};
      if (!history[fileName]) {
        history[fileName] = [];
      }
      history[fileName].push(message.data);
      chrome.storage.local.set({ history }, () => sendResponse({ success: true }));
    });

    return true;
  }




  if (message.type === 'GET_AVG_RESPONSE_TIME') {
    calculateAverageResponseTime(message.model || '', message.maxTokens || 0) // provide defaults
      .then(avgTime => {
        sendResponse({ success: true, avgTime });
      });

    return true;
  }




  if (message.type === 'GET_AVAILABLE_MODELS') {
    const models = ['model-a', 'model-b', 'model-c']; // Replace with actual models retrieved according to selected provider
    sendResponse({ success: true, models });
    return true;
  }



  if (message.type === 'PURGE_HISTORY') {
    chrome.storage.local.remove('history').then(() => {
      sendResponse({ success: true });
    });
    return true;
  }


  if (message.type === 'DELETE_HISTORY_ITEM') {
    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || {};

      Object.keys(history).forEach((dateKey) => {
        history[dateKey] = history[dateKey].filter((item: any) => item.id !== message.id);
      });

      chrome.storage.local.set({ history }, () => sendResponse({ success: true }));
    });

    return true;
  }



  if (message.type === 'GET_HISTORY') {
    chrome.storage.local.get(['history'], (result) => {
      const history: Record<string, HistoryItem[]> = result.history || {};
      let allItems: HistoryItem[] = [];

      Object.values(history).forEach((items: HistoryItem[]) => {
        if (Array.isArray(items)) {
            allItems = allItems.concat(items);
        }
      });
      
      sendResponse({ success: true, data: allItems });
    });
    return true;
  }




      if (message.type === 'GET_MEMORY_PROFILES') {

        chrome.storage.local.get(['memoryProfiles'], (result) => {
          const profiles = result.memoryProfiles || [];
          sendResponse({ success: true, profiles: profiles as MemoryProfile[] }); // Type cast here
        });

      return true;
    }

});


chrome.action.onClicked.addListener(() => {
  if (isSidebarOpen) {
    chrome.sidePanel.setOptions({ path: '' });
    isSidebarOpen = false;
  } else {
    chrome.sidePanel.setOptions({ path: 'sidebar.html' });
    isSidebarOpen = true;
  }
});
