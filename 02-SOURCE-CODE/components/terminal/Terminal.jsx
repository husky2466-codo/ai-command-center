import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from '../../themes/ThemeContext';
import { Wand2 } from 'lucide-react';
import PromptCrafter from './PromptCrafter';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

// Helper to get CSS variable value
const getCSSVar = (varName) => {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

// Helper to convert hex to rgba for selection
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Terminal = ({ apiKeys, instanceId }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const terminalIdRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [showCrafter, setShowCrafter] = useState(false);
  const [initAttempt, setInitAttempt] = useState(0); // Track retry attempts
  const { currentTheme } = useTheme();

  // Debug: Log when component mounts/unmounts
  useEffect(() => {
    console.log('[Terminal] Component mounted with instanceId:', instanceId);
    return () => {
      console.log('[Terminal] Component unmounting with instanceId:', instanceId);
    };
  }, [instanceId]);

  // Initialize terminal once on mount
  useEffect(() => {
    console.log('[Terminal] Initialization effect running for instanceId:', instanceId, 'attempt:', initAttempt);
    console.log('[Terminal] terminalRef.current available?', !!terminalRef.current);

    // Prevent double initialization (e.g., from React Strict Mode)
    if (xtermRef.current) {
      console.log('[Terminal] Already initialized, skipping');
      return;
    }

    // Ensure DOM ref is available - if not, defer initialization
    if (!terminalRef.current) {
      console.warn('[Terminal] terminalRef.current is null! Deferring initialization... (attempt', initAttempt, ')');
      // Try again after a small delay to let DOM settle
      const timer = setTimeout(() => {
        if (terminalRef.current && !xtermRef.current) {
          console.log('[Terminal] Retrying initialization after delay...');
          // Trigger re-render to run this effect again by incrementing attempt counter
          setInitAttempt(prev => prev + 1);
        } else if (!terminalRef.current && initAttempt < 10) {
          // Keep trying up to 10 times
          console.log('[Terminal] DOM still not ready, scheduling another retry...');
          setInitAttempt(prev => prev + 1);
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    try {
      console.log('[Terminal] Starting XTerm initialization...');

      // Get theme colors from CSS variables
      const bgColor = getCSSVar('--bg-primary') || '#1a1a2e';
      const textColor = getCSSVar('--text-primary') || '#e0e0e0';
      const accentColor = getCSSVar('--accent-primary') || '#ffd700';

      console.log('[Terminal] Theme colors:', { bgColor, textColor, accentColor });

      // Initialize xterm.js with theme colors
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: {
          background: bgColor,
          foreground: textColor,
          cursor: accentColor,
          cursorAccent: bgColor,
          selection: hexToRgba(accentColor, 0.3),
          black: '#000000',
          red: '#e06c75',
          green: '#98c379',
          yellow: '#e5c07b',
          blue: '#61afef',
          magenta: '#c678dd',
          cyan: '#56b6c2',
          white: '#abb2bf',
          brightBlack: '#5c6370',
          brightRed: '#e06c75',
          brightGreen: '#98c379',
          brightYellow: '#e5c07b',
          brightBlue: '#61afef',
          brightMagenta: '#c678dd',
          brightCyan: '#56b6c2',
          brightWhite: '#ffffff'
        },
        allowProposedApi: true,
        scrollback: 10000,
        // Enable right-click selection
        rightClickSelectsWord: false
      });

      console.log('[Terminal] XTerm instance created');

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      console.log('[Terminal] FitAddon loaded');

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Open terminal in the DOM
      console.log('[Terminal] Opening terminal in DOM...');
      term.open(terminalRef.current);
      console.log('[Terminal] Terminal opened successfully');

      // Try to fit, but it may fail if container is hidden
      try {
        const rect = terminalRef.current.getBoundingClientRect();
        console.log('[Terminal] Container dimensions:', { width: rect.width, height: rect.height });

        if (rect.width > 0 && rect.height > 0) {
          fitAddon.fit();
          console.log('[Terminal] Terminal fitted to container');
        } else {
          console.log('[Terminal] Container not visible yet, will fit when visible');
        }
      } catch (fitError) {
        console.warn('[Terminal] Fit failed (container may be hidden):', fitError.message);
      }

      // Setup copy/paste functionality
      // 1. Copy on selection (automatically copy selected text)
      term.onSelectionChange(() => {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection).catch(err => {
            console.error('Failed to copy to clipboard:', err);
          });
        }
      });

      // 2. Handle paste from keyboard (Ctrl+V or Cmd+V)
      term.attachCustomKeyEventHandler((event) => {
        // Check for paste command (Ctrl+V on Windows/Linux, Cmd+V on Mac)
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const pasteKey = (isMac && event.metaKey) || (!isMac && event.ctrlKey);

        if (pasteKey && event.key === 'v' && event.type === 'keydown') {
          // Prevent default to avoid terminal processing
          event.preventDefault();

          // Read from clipboard and paste
          navigator.clipboard.readText().then(text => {
            if (terminalIdRef.current && text) {
              window.electronAPI.writeToTerminal(terminalIdRef.current, text);
            }
          }).catch(err => {
            console.error('Failed to read from clipboard:', err);
          });

          return false; // Prevent xterm from processing this key
        }

        // Check for copy command (Ctrl+C or Cmd+C) when text is selected
        const copyKey = (isMac && event.metaKey) || (!isMac && event.ctrlKey);
        if (copyKey && event.key === 'c' && event.type === 'keydown') {
          const selection = term.getSelection();
          if (selection) {
            // If text is selected, copy it and prevent sending SIGINT
            event.preventDefault();
            navigator.clipboard.writeText(selection).catch(err => {
              console.error('Failed to copy to clipboard:', err);
            });
            return false; // Prevent xterm from processing this key
          }
          // If no selection, let Ctrl+C pass through as SIGINT
        }

        return true; // Let xterm process all other keys normally
      });

      // 3. Right-click context menu paste support
      terminalRef.current?.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        // Read from clipboard and paste on right-click
        navigator.clipboard.readText().then(text => {
          if (terminalIdRef.current && text) {
            window.electronAPI.writeToTerminal(terminalIdRef.current, text);
          }
        }).catch(err => {
          console.error('Failed to read from clipboard:', err);
        });
      });

      console.log('[Terminal] Event handlers attached');

      // Create PTY process
      console.log('[Terminal] Creating PTY process...');

      // Check if Electron API is available
      if (!window.electronAPI?.createTerminal) {
        console.warn('[Terminal] Electron API not available - terminal requires Electron');
        term.writeln('\x1b[33m⚠ Terminal requires Electron environment\x1b[0m');
        term.writeln('\x1b[90mRun the app with: npm run dev:electron\x1b[0m');
        return;
      }

      window.electronAPI.createTerminal().then(terminalId => {
        console.log('[Terminal] PTY created with ID:', terminalId);
        terminalIdRef.current = terminalId;
        setIsReady(true);

        // Set up data listener from PTY
        window.electronAPI.onTerminalData(terminalId, (data) => {
          term.write(data);
        });

        // Send initial resize
        const { cols, rows } = term;
        window.electronAPI.resizeTerminal(terminalId, cols, rows);
        console.log('[Terminal] Initial resize sent:', { cols, rows });
      }).catch(err => {
        console.error('[Terminal] Failed to create PTY:', err);
      });

      // Handle terminal input (user typing)
      const disposable = term.onData(data => {
        if (terminalIdRef.current) {
          window.electronAPI.writeToTerminal(terminalIdRef.current, data);
        }
      });

      // Handle window resize
      const handleResize = () => {
        if (fitAddonRef.current && terminalIdRef.current) {
          fitAddonRef.current.fit();
          const { cols, rows } = xtermRef.current;
          window.electronAPI.resizeTerminal(terminalIdRef.current, cols, rows);
        }
      };

      window.addEventListener('resize', handleResize);

      console.log('[Terminal] Initialization complete');

      // Cleanup on unmount ONLY
      return () => {
        console.log('[Terminal] Cleaning up terminal...');
        disposable.dispose();
        window.removeEventListener('resize', handleResize);
        if (terminalIdRef.current) {
          window.electronAPI.killTerminal(terminalIdRef.current);
        }
        term.dispose();
      };
    } catch (error) {
      console.error('[Terminal] Initialization error:', error);
      console.error('[Terminal] Error stack:', error.stack);
    }
  }, [initAttempt]); // Re-run when initAttempt changes (for retry logic)

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (xtermRef.current) {
      const bgColor = getCSSVar('--bg-primary') || '#1a1a2e';
      const textColor = getCSSVar('--text-primary') || '#e0e0e0';
      const accentColor = getCSSVar('--accent-primary') || '#ffd700';

      xtermRef.current.options.theme = {
        background: bgColor,
        foreground: textColor,
        cursor: accentColor,
        cursorAccent: bgColor,
        selection: hexToRgba(accentColor, 0.3),
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      };
    }
  }, [currentTheme]);

  // Handle visibility changes - refit terminal when it becomes visible
  useEffect(() => {
    const element = terminalRef.current;
    if (!element) {
      console.log('[Terminal] No element to observe for visibility');
      return;
    }

    const handleVisibilityChange = () => {
      if (fitAddonRef.current && xtermRef.current && terminalIdRef.current) {
        try {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log('[Terminal] Refitting after visibility change');
            fitAddonRef.current.fit();
            const { cols, rows } = xtermRef.current;
            window.electronAPI.resizeTerminal(terminalIdRef.current, cols, rows);
          }
        } catch (err) {
          console.warn('[Terminal] Error during refit:', err.message);
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Terminal became visible - refit it to ensure proper sizing
            setTimeout(handleVisibilityChange, 100);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    console.log('[Terminal] Visibility observer attached');

    // Also handle initial visibility (in case already visible)
    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTimeout(handleVisibilityChange, 200);
      }
    });

    return () => {
      observer.unobserve(element);
    };
  }, [isReady]); // Re-run when terminal becomes ready

  // Handler to send text to terminal PTY
  const handleSendToTerminal = useCallback((text) => {
    if (terminalIdRef.current) {
      window.electronAPI.writeToTerminal(terminalIdRef.current, text);
    }
  }, []);

  return (
    <div className="terminal-with-crafter">
      <div className="terminal-main" style={{ flex: showCrafter ? '0 0 65%' : '1' }}>
        <div className="terminal-header">
          <div className="terminal-title">
            <span className="terminal-icon">▶</span>
            <span>Integrated Terminal</span>
          </div>
          <div className="terminal-controls">
            <button
              className={`crafter-toggle ${showCrafter ? 'active' : ''}`}
              onClick={() => setShowCrafter(!showCrafter)}
              title="Prompt Crafter"
            >
              <Wand2 size={16} />
            </button>
          </div>
          <div className="terminal-status">
            {isReady ? (
              <span className="status-ready">● Connected</span>
            ) : (
              <span className="status-loading">● Connecting...</span>
            )}
          </div>
        </div>
        <div className="terminal-wrapper" ref={terminalRef}></div>
      </div>

      {showCrafter && (
        <PromptCrafter
          onSendToTerminal={handleSendToTerminal}
          onClose={() => setShowCrafter(false)}
        />
      )}
    </div>
  );
};

export default Terminal;
