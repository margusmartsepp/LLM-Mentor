import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  TextareaAutosize,
  TextField,
  Switch,
  Fab,
  Slider,
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import { marked } from 'marked'; // Importing the marked library
import hljs from 'highlight.js'; // Import highlight.js
import 'highlight.js/styles/github.css'; // You can import a theme for syntax highlighting

// Import RxJS functions and operators
import { BehaviorSubject, from, of, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

// Helper function to count words as tokens (ignoring whitespace)
const countTokens = (text) => {
  return text ? text.trim().split(/\s+/).length : 0;
};

// Configure marked to use highlight.js
marked.setOptions({
  highlight: function (code, language) {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value; // Fallback to automatic language detection
  },
});

function App() {
  const [value, setValue] = useState(0);
  const [prependMemory, setPrependMemory] = useState(true); // Default ON
  const [outputFormat, setOutputFormat] = useState('.md'); // Default to markdown rendering
  const [prompt, setPrompt] = useState('');
  const [memory, setMemory] = useState(''); // Memory content
  const [response, setResponse] = useState(''); // API response
  const [tokensUsed, setTokensUsed] = useState(0); // Total tokens
  const [memoryTokens, setMemoryTokens] = useState(0); // Tokens for memory
  const [promptTokens, setPromptTokens] = useState(0); // Tokens for prompt
  const [requestTime, setRequestTime] = useState(0.0);

  // State variables for settings
  const [apiUrl, setApiUrl] = useState('http://localhost:1234/v1/chat/completions');
  const [model, setModel] = useState('meta-llama-3.1-8b-instruct');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleTemperatureChange = (event, newTemperature) => {
    setTemperature(newTemperature);
  };

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleMemoryChange = (e) => {
    setMemory(e.target.value);
  };

  // Debounce token calculation for memory and prompt
  useEffect(() => {
    const memory$ = new BehaviorSubject(memory);
    const prompt$ = new BehaviorSubject(prompt);

    const subscription = combineLatest([memory$, prompt$])
      .pipe(debounceTime(800)) // Debounce the calculation
      .subscribe(([memoryContent, promptContent]) => {
        const memTokens = countTokens(memoryContent);
        const prmTokens = countTokens(promptContent);
        setMemoryTokens(memTokens);
        setPromptTokens(prmTokens);
        setTokensUsed(memTokens + prmTokens); // Total tokens
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [memory, prompt]);

  // Function to make the API call via Chrome extension messaging
  const makeApiCall = (url, model, prompt, maxTokens, temperature) => {
    const messages = prependMemory
      ? [{ role: 'system', content: memory }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];

    return from(
      new Promise((resolve, reject) => {
        // Ensure we're in the correct Chrome extension environment
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage(
            {
              type: 'API_CALL',
              url: url,
              model: model,
              messages: messages,
              max_tokens: maxTokens,
              temperature: temperature,
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
  };

  useEffect(() => {
    const prompt$ = new BehaviorSubject(prompt);
    const model$ = new BehaviorSubject(model);
    const maxTokens$ = new BehaviorSubject(maxTokens);
    const temperature$ = new BehaviorSubject(temperature);
    const url$ = new BehaviorSubject(apiUrl);

    let timerInterval;
    let startTime;

    const startTimer = () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      startTime = Date.now();
      setRequestTime(0.0);
      timerInterval = setInterval(() => {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        setRequestTime(elapsedTime);
      }, 100);
    };

    const stopTimer = () => {
      clearInterval(timerInterval);
    };

    // Handle prompt input changes via RxJS observables
    const subscription = prompt$
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        switchMap(() =>
          prompt.trim() !== ''
            ? combineLatest([of(prompt), model$, maxTokens$, temperature$, url$]).pipe(
                switchMap(([prompt, model, maxTokens, temperature, url]) => {
                  startTimer();
                  return makeApiCall(url, model, prompt, maxTokens, temperature);
                })
              )
            : of({ error: 'Prompt is empty' })
        )
      )
      .subscribe(
        (result) => {
          if (result.error) {
            setResponse(`Error: ${result.error}`);
          } else {
            setResponse(result.choices[0].message.content);
          }
          stopTimer();
        },
        (error) => {
          setResponse(`Error: ${error}`);
          stopTimer();
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [prompt, model, maxTokens, temperature, apiUrl]);

  // Function to render both the Markdown and raw text, but only display one at a time
  const renderResponse = () => {
    return (
      <>
        {/* Render Markdown as HTML with syntax highlighting */}
        {outputFormat === '.md' && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              .md format:
            </Typography>
            <br />
            <Box
              dangerouslySetInnerHTML={{ __html: marked(response) }} // Render Markdown as HTML with code highlighting
              style={{ display: outputFormat === '.md' ? 'block' : 'none', overflowY: 'auto', height: 'calc(100% - 480px)' }}
            />
          </Box>
        )}
  
        {/* Render raw text if Raw is selected */}
        {outputFormat !== '.md' && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Raw format:
            </Typography>
            <br />
            <TextareaAutosize
              value={response}
              readOnly
              style={{ width: '100%', height: 'calc(100% - 480px)', display: outputFormat !== '.md' ? 'block' : 'none' }}
            />
          </Box>
        )}
      </>
    );
  };

  return (
    <Box sx={{ width: 770, height: 570 }}>
      <AppBar position="static">
        <Toolbar>
          <Box component="img" src="icons/icon48.png" sx={{ width: 32, height: 32, mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            LLM Mentor
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Memory View */}
      {value === 0 && (
        <Box sx={{ p: 2, height: 'calc(100% - 120px)' }}>
          <TextareaAutosize
            placeholder="Enter your memory here..."
            value={memory}
            onChange={handleMemoryChange}
            style={{ width: '100%', height: 'calc(100% - 160px)' }}
          />
          <Typography variant="body2" align="right" color="text.secondary">
            Memory Tokens: {memoryTokens}
          </Typography>
        </Box>
      )}

      {/* LLM Mentor View */}
      {value === 1 && (
        <Box sx={{ p: 2, height: 'calc(100% - 120px)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body1">Prepend Memory</Typography>
            <Switch checked={prependMemory} onChange={(e) => setPrependMemory(e.target.checked)} />
            <Fab
              size="small"
              color={outputFormat === '.md' ? 'primary' : 'default'}
              onClick={() => setOutputFormat(outputFormat === '.md' ? 'Raw' : '.md')}
            >
              {outputFormat}
            </Fab>
          </Box>
          <TextField
            label="Enter your prompt..."
            multiline
            minRows={6}
            sx={{ width: '100%' }}
            value={prompt}
            onChange={handlePromptChange}
          />
          <Typography variant="body2" color="text.secondary">
            Prompt Tokens: {promptTokens} | Tokens used: {tokensUsed}/{maxTokens} | Request time: {requestTime}s
          </Typography>
          {renderResponse()}
        </Box>
      )}

      {/* Settings View */}
      {value === 2 && (
        <Box sx={{ p: 2 }}>
          <TextField
            label="API URL"
            fullWidth
            sx={{ mb: 2 }}
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)} // Bind to state
          />
          <TextField
            label="Model"
            fullWidth
            sx={{ mb: 2 }}
            value={model}
            onChange={(e) => setModel(e.target.value)} // Bind to state
          />
          <TextField
            label="Max Tokens"
            fullWidth
            type="number"
            sx={{ mb: 2 }}
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))} // Bind to state
          />
          {/* Temperature Slider */}
          <Typography gutterBottom sx={{ mr: 2 }}>
            Temperature: {temperature.toFixed(2)}
          </Typography>
          <Slider
            value={temperature}
            min={0.0}
            max={1.0}
            step={0.01}
            onChange={handleTemperatureChange}
            valueLabelDisplay="auto"
            sx={{ flexGrow: 1 }} // Ensures the slider takes available space
          />
        </Box>
      )}

      <BottomNavigation
        showLabels
        value={value}
        onChange={handleChange}
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
      >
        <BottomNavigationAction label="Memory" icon={<MemoryIcon />} />
        <BottomNavigationAction label="LLM Mentor" icon={<SchoolIcon />} />
        <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
      </BottomNavigation>
    </Box>
  );
}

export default App;
