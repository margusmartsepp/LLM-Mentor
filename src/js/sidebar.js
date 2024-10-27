
// Hook up the DOM elements
document.addEventListener('DOMContentLoaded', () => {
  componentHandler.upgradeDom();  // Initialize MDL components

  // Access RxJS objects through `rxjs`
  const { fromEvent, combineLatest, BehaviorSubject } = rxjs; // Access RxJS objects
  const { switchMap } = rxjs.operators; // Use switchMap instead of flatMap for request cancellation
  // Set up BehaviorSubjects for reactive updates
  const prompt$ = new BehaviorSubject('');
  const model$ = new BehaviorSubject('Meta-Llama-3.1-8B-Instruct-Q4_K_M');
  const maxTokens$ = new BehaviorSubject(4096);
  const temperature$ = new BehaviorSubject(0.7);
  const url$ = new BehaviorSubject('http://localhost:1234/v1/chat/completions');

  const promptInput = document.getElementById('prompt');
  const sendButton = document.getElementById('send');
  const responseDiv = document.getElementById('response');
  const modelInput = document.getElementById('model');
  const maxTokensInput = document.getElementById('max_tokens');
  const temperatureInput = document.getElementById('temperature');
  const urlInput = document.getElementById('url');
  const mainTab = document.getElementById('main-tab');
  const settingsTab = document.getElementById('settings-tab');
  const mainContent = document.getElementById('main-content');
  const settingsContent = document.getElementById('settings-content');
  const tabs = document.querySelectorAll('.bottom-nav button');
  const progressContainer = document.getElementById('progress-container');
  const timerDisplay = document.getElementById('timer');
  // Bind input changes to BehaviorSubjects
  // Create an observable from the text input field's 'input' event
  const promptInput$ = fromEvent(promptInput, 'input').pipe(
    rxjs.map(event => event.target.value),              // Get the current value of the input
    rxjs.debounceTime(800),                             // Debounce to wait 800ms after the last input
    rxjs.distinctUntilChanged()                        // Emit only if the value has actually changed
  );
  fromEvent(modelInput, 'input').subscribe(event => model$.next(event.target.value));
  fromEvent(maxTokensInput, 'input').subscribe(event => maxTokens$.next(parseInt(event.target.value)));
  fromEvent(temperatureInput, 'input').subscribe(event => temperature$.next(parseFloat(event.target.value)));
  fromEvent(urlInput, 'input').subscribe(event => url$.next(event.target.value));
  let timerInterval;
  let startTime;

  // Function to start the timer
  function startTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);  // Clear any existing interval before starting a new one
    }
    startTime = Date.now();
    timerDisplay.textContent = '0.0'; // Start with 0.0 for more precision
    timerInterval = setInterval(() => {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1); // Calculate in seconds and show one decimal place
      timerDisplay.textContent = elapsedTime;
    }, 100);  // Run every 100 ms (0.1 seconds)
  }  

  // Function to stop the timer
  function stopTimer() {
    clearInterval(timerInterval);
  }

  // Function to show the progress bar
  function showProgress() {
    progressContainer.style.display = 'block';
    startTimer();  // Start the timer
  }

  // Function to hide the progress bar
  function hideProgress() {
    progressContainer.style.display = 'none';
    stopTimer();  // Stop the timer
  }
  // Transforming and combining observables
  promptInput$.pipe(
    switchMap(prompt =>
      prompt.trim() !== '' ?  // Only proceed if prompt is not empty
        combineLatest([rxjs.of(prompt), model$, maxTokens$, temperature$, url$]).pipe(
          switchMap(([prompt, model, maxTokens, temperature, url]) => {
            showProgress();
            // Make API call here, convert Promise to observable
            return rxjs.from(makeApiCall(url, model, prompt, maxTokens, temperature));
          })
        ) :
        rxjs.of({ error: 'Prompt is empty' })  // Return an error if prompt is empty
    )
  ).subscribe(
    result => {
      if (result.error) {
        responseDiv.innerHTML = `Error: ${result.error}`;
      } else {
        responseDiv.innerHTML = result.choices[0].message.content;
      }
      hideProgress();
    },
    error => {
      responseDiv.innerHTML = `Error: ${error}`;
      hideProgress();
    }
  );

  // Helper function to switch content and active classes
  const switchContent = (activeContent, inactiveContent) => {
    activeContent.classList.add('active-page');
    inactiveContent.classList.remove('active-page');
  };
  // Main Tab click event
  fromEvent(mainTab, 'click').subscribe(() => {
    switchContent(mainContent, settingsContent);
  });

  // Settings Tab click event
  fromEvent(settingsTab, 'click').subscribe(() => {
    switchContent(settingsContent, mainContent);
  });

  // Handle active class toggling for highlighting the selected tab
  tabs.forEach(tab => {
    fromEvent(tab, 'click').subscribe(() => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});

// Function to make the API call via background script, returning an RxJS Observable
function makeApiCall(url, model, prompt, maxTokens, temperature) {
  return rxjs.from(
    new Promise((resolve, reject) => {
      // Ensure we're in the correct Chrome extension environment
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: 'API_CALL',
            url: url,
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: temperature
          },
          (response) => {
            if (response && response.success) {
              resolve(response.data);
            } else {
              reject(response.error || 'No response');
            }
          }
        );
      } else {
        reject('chrome.runtime.sendMessage is not available');
      }
    })
  );
}



