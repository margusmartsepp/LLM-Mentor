import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Box, BottomNavigation, BottomNavigationAction,
  TextareaAutosize, TextField, Switch, Fab, Slider, LinearProgress, Autocomplete,
  Button, IconButton, MenuItem
} from '@mui/material';
import { TreeView, TreeItem } from '@mui/lab';
import MemoryIcon from '@mui/icons-material/Memory';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import ReplayIcon from '@mui/icons-material/Replay';
import DeleteIcon from '@mui/icons-material/Delete';
import { BehaviorSubject, combineLatest, from, of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TreeData, ModelProviders, MemoryProfile, HistoryItem, ChromeMessage, APIResponse, ApiRequest } from './types';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#0971f1' },
    secondary: { main: '#f50057' },
  },
});

const countTokens = (text: string): number => (text ? text.trim().split(/\s+/).length : 0);

function App() {
  const [value, setValue] = useState(0);
  const [prependMemory, setPrependMemory] = useState(true);
  const [outputFormat, setOutputFormat] = useState('.md');
  const [prompt, setPrompt] = useState('');
  const [memory, setMemory] = useState('');
  const [responseText, setResponseText] = useState('');
  const [memoryTokens, setMemoryTokens] = useState(0);
  const [promptTokens, setPromptTokens] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [requestTime, setRequestTime] = useState(0);
  const [apiUrl, setApiUrl] = useState('http://localhost:1234/v1/chat/completions');
  const [model, setModel] = useState<string | null>('meta-llama/Llama-2-7b-chat-hf');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avgResponseTimes, setAvgResponseTimes] = useState<Record<string, number>>({});
  const [expectedDuration, setExpectedDuration] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ModelProviders>(ModelProviders.LOCAL);
  const [memoryProfiles, setMemoryProfiles] = useState<MemoryProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [expandedProfileNodes, setExpandedProfileNodes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  let timerInterval: NodeJS.Timeout | null = null;

  useEffect(() => {
    combineLatest([new BehaviorSubject(memory), new BehaviorSubject(prompt)])
      .pipe(debounceTime(800))
      .subscribe(([memoryContent, promptContent]) => {
        setMemoryTokens(countTokens(memoryContent));
        setPromptTokens(countTokens(promptContent));
        setTokensUsed(countTokens(memoryContent) + countTokens(promptContent));
      });
  }, [prompt, model, maxTokens, temperature, apiUrl, memory, prependMemory, selectedProvider]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AVAILABLE_MODELS' }, (response: APIResponse) => {
      if (response?.success && response.models) {
        setAvailableModels(response.models);
      }
    });
  }, [value, searchTerm]);

  const ModelSelector = () => (
    <Autocomplete
      options={availableModels}
      value={model}
      onChange={(_, newValue) => setModel(newValue as string | null)}
      renderInput={(params) => <TextField {...params} label="Select Model" />}
      sx={{ width: 300, mr: 2 }}
    />
  );

  const calculateAvgResponseTime = (model: string, maxTokens: number) => {
    chrome.runtime.sendMessage({ type: 'GET_AVG_RESPONSE_TIME', model, maxTokens }, (response: APIResponse) => {
      if (response?.success) {
        setAvgResponseTimes(prev => ({ ...prev, [`${model}_${maxTokens}`]: response.avgTime || 0 }));
      }
    });
  };

  const makeApiCall = (url: string, model: string, prompt: string, maxTokens: number, temperature: number, selectedProvider: ModelProviders) => {
    const timestamp = new Date();
    const requestData = {
      timestamp, model, prompt, memory: prependMemory ? memory : null, maxTokens, temperature, url
    };

    const messages = prependMemory
      ? [{ role: 'system', content: memory }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];

    return from(new Promise((resolve, reject) => {
      let requestBody;
      let requestUrl = url;

      if (selectedProvider === ModelProviders.LOCAL) {
        requestBody = {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        };
      }

      chrome.runtime.sendMessage({ type: 'API_CALL', ...requestData, url: requestUrl, messages }, (response: APIResponse) => {
        if (response && response.success) {
          if (!response.cached) {
            chrome.runtime.sendMessage({ type: 'SAVE_HISTORY', data: { ...requestData, response: response.data } });
          }
          resolve(response.data);
        } else {
          reject(response?.error || 'No response');
        }
      });
    }));
  };

  useEffect(() => {
    let subscription: Subscription | undefined;
    const prompt$ = new BehaviorSubject(prompt);

    if (prompt.trim() !== '') {
      subscription = prompt$
        .pipe(
          debounceTime(800),
          distinctUntilChanged(),
          switchMap(() => combineLatest([of(prompt), of(model), of(maxTokens), of(temperature), of(apiUrl)]).pipe(
            switchMap(([p, m, mt, t, u]) => makeApiCall(u, m!, p, mt, t, selectedProvider))
          )))
        .subscribe((result: any) => {
          setResponseText(result?.choices?.[0]?.message?.content || `Error: ${result?.error || 'Unknown error'}`);
          stopTimer();
        }, (error) => {
          setResponseText(`Error: ${error}`);
          stopTimer();
        });
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      prompt$.complete();
    };
  }, [prompt, model, maxTokens, temperature, apiUrl, memory, prependMemory, selectedProvider]);

  useEffect(() => {
    if (value === 3) {
      chrome.runtime.sendMessage({ type: 'GET_HISTORY', searchTerm }, (response: APIResponse) => {
        if (response?.success) {
          setHistoryItems(response.data || []);
        }
      });
    }
  }, [value, searchTerm]);

  useEffect(() => {
    if (value !== 3) {
      setHistoryItems([]);
      setSelectedHistoryItem(null);
      setSearchTerm('');
    }
  }, [value]);

  const startTimer = (): NodeJS.Timeout => {
    setIsLoading(true);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setRequestTime(elapsed);
    }, 100);

    timerInterval = interval;
    return interval;
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    setIsLoading(false);
  };

  const renderResponse = () => (
    <>
      {outputFormat === '.md' && (
        <Box>
          <Typography variant="body2" color="text.secondary">.md format:</Typography>
          <br />
          <Box>{responseText}</Box>
        </Box>
      )}

      {outputFormat !== '.md' && (
        <Box>
          <Typography variant="body2" color="text.secondary">Raw format:</Typography>
          <br />
          <TextareaAutosize value={responseText} readOnly style={{ width: '100%', height: 'calc(100% - 480px)' }} />
        </Box>
      )}
    </>
  );

  const renderHistory = () => (
    <Box sx={{ p: 2, height: 'calc(100% - 120px)' }}>
      <TextField label="Search history..." fullWidth sx={{ mb: 2 }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

      <Box sx={{ height: selectedHistoryItem ? '50%' : '100%', overflowY: 'auto' }}>
        {historyItems.map((item) => (
          <Box
            key={item.id || item.timestamp.toString()}
            sx={{
              p: 1,
              mb: 1,
              border: '1px solid #ddd',
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
            onClick={() => setSelectedHistoryItem(item)}
          >
            <Typography variant="subtitle2">{new Date(item.timestamp).toLocaleString()}</Typography>
            <Typography noWrap>{item.prompt}</Typography>
            <HistoryItemActions item={item} refreshHistory={() => {
              chrome.runtime.sendMessage({ type: 'GET_HISTORY', searchTerm }, (response: APIResponse) => {
                if (response?.success) {
                  setHistoryItems(response.data || []);
                }
              });
            }} />
          </Box>
        ))}
      </Box>

      {selectedHistoryItem && (
        <Box sx={{ height: '50%', mt: 2 }}>
          <Typography variant="h6">Selected Entry</Typography>
          {renderResponse()}
        </Box>
      )}
      <Button onClick={purgeHistory} sx={{ mt: 2 }}>Purge All History</Button>
    </Box>
  );

  const ProgressWithTimer: React.FC<{ isLoading: boolean; requestTime: number; expectedTime: number }> = ({ isLoading, requestTime, expectedTime }) => {
    const progress = Math.min((requestTime / expectedTime) * 100, 100);
    let color = 'success';

    if (requestTime > expectedTime * 2) {
      color = 'error';
    } else if (requestTime > expectedTime) {
      color = 'warning';
    }

    return (
      <Box sx={{ width: '100%', mt: 1, mb: 1 }}>
        {isLoading && (
          <>
            <LinearProgress variant={requestTime > expectedTime * 3 ? 'indeterminate' : 'determinate'} value={progress} color={color as any} />
            <Typography variant="caption" color="text.secondary">{requestTime}s / ~{expectedTime}s </Typography>
          </>
        )}
      </Box>
    );
  };

  const HistoryItemActions: React.FC<{ item: HistoryItem; refreshHistory: () => void }> = ({ item, refreshHistory }) => {
    const handleReprompt = (useMemory = false) => {
      setPrompt(item.prompt);
      if (useMemory && item.memory) {
        setMemory(item.memory);
        setPrependMemory(true);
      }
      setValue(1);

      if (item.model === model && item.maxTokens === maxTokens) {
        setExpectedDuration(item.requestTime);
      }
    };

    const handleDelete = () => {
      if (!item.id) return;

      chrome.runtime.sendMessage({ type: 'DELETE_HISTORY_ITEM', id: item.id }, () => {
        refreshHistory();
      });
    };

    return (
      <Box sx={{ mt: 1 }}>
        <Button size="small" onClick={() => handleReprompt(false)} startIcon={<ReplayIcon />}>Reprompt</Button>
        <Button size="small" onClick={() => handleReprompt(true)} startIcon={<MemoryIcon />}>Reprompt with Memory</Button>
        <IconButton onClick={handleDelete}><DeleteIcon /></IconButton>
      </Box>
    );
  };

  const MemoryProfileSelector = () => {
    const selectedProfileObject = memoryProfiles.find(p => p.id === selectedProfile) || null;
    return (
      <Autocomplete
        options={memoryProfiles}
        getOptionLabel={(option: MemoryProfile) => `${option.path}/${option.name}`}
        renderInput={(params) => <TextField {...params} label="Memory Profile" />}
        value={selectedProfileObject}
        onChange={(_, newValue) => {
          if (newValue) {
            setSelectedProfile(newValue.id);
            setMemory(newValue.content);
          } else {
            setSelectedProfile(null);
            setMemory('');
          }
        }}
        sx={{ mx: 2, width: 300 }}
      />
    );
  };

  const purgeHistory = () => {
    chrome.runtime.sendMessage({ type: 'PURGE_HISTORY' }, (response) => {
      if (response.success) {
        setHistoryItems([]);
        setSelectedHistoryItem(null);
      }
    });
  };

  const MemoryProfilesTree: React.FC = () => {
    const [profiles, setProfiles] = useState<MemoryProfile[]>([]);
    const [expandedProfileNodes, setExpandedProfileNodes] = useState<string[]>([]);

    useEffect(() => {
      chrome.runtime.sendMessage({ type: 'GET_MEMORY_PROFILES' }, (response: APIResponse) => {
        if (response?.success) {
          setProfiles(response.profiles || []);
        }
      });
    }, []);

    const buildTree = (profiles: MemoryProfile[]): TreeData => {
      const tree: TreeData = {};
      profiles.forEach(profile => {
        const parts = profile.path.split('/');
        let current = tree;

        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = { children: {}, profiles: [] };
          }

          if (index < parts.length - 1) {
            current = current[part].children!;
          } else {
            current[part].profiles!.push(profile);
          }
        });
      });
      return tree;
    };

    const renderTree = (node: TreeData, path = '') => {
      return Object.entries(node).map(([key, value]: [string, any]) => (
        <TreeItem key={path ? `${path}/${key}` : key} nodeId={path ? `${path}/${key}` : key} label={key}>
          {value.profiles && value.profiles.map((profile: MemoryProfile) => (
            <TreeItem
              key={profile.id}
              nodeId={profile.id}
              label={profile.name}
              onClick={() => {
                setSelectedProfile(profile.id);
                setMemory(profile.content);
              }}
            />
          ))}
          {value.children && renderTree(value.children, path ? `${path}/${key}` : key)}
        </TreeItem>
      ));
    };

    return (
      <TreeView
        expanded={expandedProfileNodes}
        onNodeToggle={(_: React.SyntheticEvent, nodeIds: string[]) => setExpandedProfileNodes(nodeIds)}
        sx={{ height: '100%', overflowY: 'auto' }}
      >
        {renderTree(buildTree(profiles))}
      </TreeView>
    );
  };

  const discoverModels = () => {
    console.log("Discovering models for provider:", selectedProvider);
  };

  const callAPI = async () => {
    // ... (your existing API call setup)

    chrome.runtime.sendMessage({ /* ... your message */ }, (response: APIResponse) => {
      if (response.success && !response.finished) {
        // Handle streaming chunk
        setResponseText(prevText => prevText + response.data); // Append the chunk to the current text
      } else if (response.success && response.finished) {
        // Stream is complete
        setStreaming(false); // Update state to indicate streaming is done
        // ... (any final processing)
      } else {
        // Handle error
        console.error("API call failed:", response.error);
      }
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: 770, height: 570 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>LLM Mentor</Typography>
          </Toolbar>
        </AppBar>

        {value === 0 && (
          <Box sx={{ p: 2, height: 'calc(100% - 120px)' }}>
            <MemoryProfilesTree />
            <Box sx={{ mt: 2 }}>
              <TextField label="Profile Name" />
              <Button>Save Profile</Button>
            </Box>
            <TextareaAutosize placeholder="Enter your memory here..." value={memory} onChange={(e) => setMemory(e.target.value)}
              style={{ width: '100%', height: 'calc(100% - 240px)' }} />
            <Typography variant="body2" align="right" color="text.secondary">Memory Tokens: {memoryTokens}</Typography>
          </Box>
        )}

        {value === 1 && (
          <Box sx={{ p: 2, height: 'calc(100% - 120px)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="body1">Prepend Memory:</Typography>
              <Switch checked={prependMemory} onChange={(e) => setPrependMemory(e.target.checked)} sx={{ mx: 2 }} />
              <MemoryProfileSelector />
              <Fab size="small" color={outputFormat === '.md' ? 'primary' : 'default'} onClick={() => setOutputFormat(outputFormat === '.md' ? 'Raw' : '.md')}>
                {outputFormat}
              </Fab>
              <ModelSelector />
            </Box>

            <TextField label="Enter your prompt..." multiline minRows={6} sx={{ width: '100%' }} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

            <ProgressWithTimer isLoading={isLoading} requestTime={requestTime} expectedTime={expectedDuration || 5} />

            <Typography variant="body2" color="text.secondary">
              Prompt Tokens: {promptTokens} | Tokens used: {tokensUsed}/{maxTokens} | Request time: {requestTime}s
            </Typography>

            {renderResponse()}
          </Box>
        )}

        {value === 2 && (
          <Box sx={{ p: 2 }}>
            <TextField label="API URL" fullWidth sx={{ mb: 2 }} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />

            <TextField label="Model" fullWidth sx={{ mb: 2 }} value={model} onChange={(e) => setModel(e.target.value)} />

            <TextField label="Max Tokens" fullWidth type="number" sx={{ mb: 2 }} value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))} />

            <Typography gutterBottom sx={{ mr: 2 }}>Temperature: {temperature.toFixed(2)}</Typography>
            <Slider value={temperature} min={0.0} max={1.0} step={0.01}
              onChange={(_, newTemperature: number | number[]) => setTemperature(Array.isArray(newTemperature) ? newTemperature[0] : newTemperature)}
              valueLabelDisplay="auto" sx={{ flexGrow: 1 }}
            />

            <TextField
              select
              label="Model Provider"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as ModelProviders)}
              sx={{ mt: 2, width: '100%' }}
            >
              {Object.values(ModelProviders).map((provider) => (
                <MenuItem key={provider} value={provider}>
                  {provider}
                </MenuItem>
              ))}
            </TextField>
            <Button onClick={discoverModels} sx={{ mt: 2 }}>
              Discover Models
            </Button>
          </Box>
        )}

        {value === 3 && renderHistory()}

        <BottomNavigation showLabels value={value} onChange={(_, newValue) => setValue(newValue)} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
          <BottomNavigationAction label="Memory" icon={<MemoryIcon />} />
          <BottomNavigationAction label="LLM Mentor" icon={<SchoolIcon />} />
          <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
          <BottomNavigationAction label="History" icon={<HistoryIcon />} />
        </BottomNavigation>
      </Box>
    </ThemeProvider>
  );
}

export default App;
