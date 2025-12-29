import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VisionApp.css';

export default function VisionApp({ apiKeys }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [autoInterval, setAutoInterval] = useState(10);
  const [frameCount, setFrameCount] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const autoTimerRef = useRef(null);
  const frameSaveTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadCameras();
    return () => {
      stopCamera();
      if (frameSaveTimerRef.current) clearInterval(frameSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto mode timer
  useEffect(() => {
    if (autoMode && cameraOn) {
      autoTimerRef.current = setInterval(() => {
        captureAndAnalyze('Describe what you see in this image.');
      }, autoInterval * 1000);
    } else {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    }
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoMode, cameraOn, autoInterval]);

  // Auto-save latest frame every 2 seconds
  useEffect(() => {
    if (cameraOn) {
      frameSaveTimerRef.current = setInterval(() => {
        saveLatestFrame();
      }, 2000);
    } else {
      if (frameSaveTimerRef.current) {
        clearInterval(frameSaveTimerRef.current);
        frameSaveTimerRef.current = null;
      }
    }
    return () => {
      if (frameSaveTimerRef.current) clearInterval(frameSaveTimerRef.current);
    };
  }, [cameraOn]);

  const loadCameras = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);

      // Prefer Razer Kiyo if available
      const kiyo = videoDevices.find(d => d.label.toLowerCase().includes('kiyo'));
      if (kiyo) {
        setSelectedCamera(kiyo.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error loading cameras:', err);
    }
  };

  const startCamera = async () => {
    if (!selectedCamera) {
      setCameraError('No camera selected');
      return;
    }

    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedCamera } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // CRITICAL FIX: Explicitly play video (autoPlay attribute not always sufficient)
        videoRef.current.play().catch(err => {
          console.warn('Error auto-playing video:', err);
        });

        // CRITICAL FIX: Wait for video to be ready before allowing captures
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('Video metadata loading timeout');
            resolve(); // Resolve anyway after timeout to not block forever
          }, 3000);

          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
            console.log('Video ready:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            resolve();
          };

          // If metadata already loaded, resolve immediately
          if (videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_FRAME) {
            clearTimeout(timeout);
            console.log('Video metadata already loaded');
            resolve();
          } else {
            videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
          }
        });
      }

      setCameraOn(true);
    } catch (err) {
      console.error('Error starting camera:', err);

      // CRITICAL FIX: Provide user-friendly error messages
      let errorMsg = 'Failed to access camera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Check Windows settings or app permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is in use by another application. Close other apps and try again.';
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Selected camera does not meet requirements. Try a different camera.';
      } else if (err.name === 'TypeError') {
        errorMsg = 'Camera access not supported. Check browser permissions.';
      }

      setCameraError(errorMsg);
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    // CRITICAL FIX: Pause video before clearing srcObject (better cleanup)
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setCameraOn(false);
    setAutoMode(false);
    setCameraError('');
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;

    // CRITICAL FIX: Ensure video is ready and has valid dimensions
    if (video.readyState < video.HAVE_CURRENT_FRAME) {
      console.warn('Video not ready for capture. State:', video.readyState);
      return null;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('Video dimensions not available:', video.videoWidth, 'x', video.videoHeight);
      return null;
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Verify the image data is valid
      if (!imageData || imageData.length < 100) {
        console.warn('Canvas capture resulted in empty or tiny image');
        return null;
      }

      return imageData;
    } catch (err) {
      console.error('Error capturing frame:', err);
      return null;
    }
  }, []);

  // Save latest frame to file for CLI access
  const saveLatestFrame = async () => {
    if (!window.electronAPI || !cameraOn) return;

    const imageData = captureFrame();
    if (!imageData) return;

    try {
      const userDataPath = await window.electronAPI.getUserDataPath();
      const base64Data = imageData.split(',')[1];

      // Save as base64 encoded file (electron will need to decode)
      await window.electronAPI.writeFile(
        `${userDataPath}\\latest-frame.txt`,
        base64Data
      );

      setFrameCount(prev => prev + 1);
    } catch (err) {
      console.error('Error saving frame:', err);
    }
  };

  // Log vision queries
  const logVisionQuery = async (prompt, response, imageData) => {
    if (!window.electronAPI) return;

    try {
      const userDataPath = await window.electronAPI.getUserDataPath();
      const logPath = `${userDataPath}\\vision-log.json`;

      // Read existing log
      let log = [];
      const existing = await window.electronAPI.readFile(logPath);
      if (existing.success) {
        try {
          log = JSON.parse(existing.content);
        } catch {
          log = [];
        }
      }

      // Add new entry
      log.push({
        timestamp: new Date().toISOString(),
        prompt,
        response,
        hasImage: !!imageData
      });

      // Keep only last 100 entries
      if (log.length > 100) {
        log = log.slice(-100);
      }

      await window.electronAPI.writeFile(logPath, JSON.stringify(log, null, 2));
    } catch (err) {
      console.error('Error logging vision query:', err);
    }
  };

  const captureAndAnalyze = async (prompt) => {
    if (!cameraOn || loading) return;

    const imageData = captureFrame();
    if (!imageData) return;

    setLoading(true);
    const userMessage = { role: 'user', content: prompt, image: imageData };
    setMessages(prev => [...prev, userMessage]);

    try {
      const base64 = imageData.split(',')[1];
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
              },
              { type: 'text', text: prompt }
            ]
          }]
        })
      });

      const data = await response.json();
      const assistantText = data.content?.[0]?.text || 'No response';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);

      // Log the query
      await logVisionQuery(prompt, assistantText, imageData);
    } catch (err) {
      console.error('API Error:', err);
      const errorMsg = `Error: ${err.message}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      await logVisionQuery(prompt, errorMsg, imageData);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    captureAndAnalyze(inputText.trim());
    setInputText('');
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="vision-app">
      <div className="vision-camera-panel">
        <div className="camera-controls">
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            disabled={cameraOn}
          >
            {cameras.map(cam => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
          <button
            className={`btn ${cameraOn ? 'btn-secondary' : 'btn-primary'}`}
            onClick={cameraOn ? stopCamera : startCamera}
            style={{ '--accent': 'var(--accent-vision)' }}
          >
            {cameraOn ? 'Stop Camera' : 'Start Camera'}
          </button>
        </div>

        <div className="camera-feed">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {!cameraOn && !cameraError && (
            <div className="camera-placeholder">
              <span>Camera Off</span>
            </div>
          )}
          {cameraError && (
            <div className="camera-placeholder camera-error">
              <span>{cameraError}</span>
            </div>
          )}
          {cameraOn && (
            <div className="frame-counter">
              Frames saved: {frameCount}
            </div>
          )}
        </div>

        <div className="auto-mode-controls">
          <label className="auto-toggle">
            <input
              type="checkbox"
              checked={autoMode}
              onChange={(e) => setAutoMode(e.target.checked)}
              disabled={!cameraOn}
            />
            Auto Mode
          </label>
          <div className="interval-control">
            <span>Every</span>
            <input
              type="number"
              min="5"
              max="60"
              value={autoInterval}
              onChange={(e) => setAutoInterval(Number(e.target.value))}
              disabled={!cameraOn}
            />
            <span>sec</span>
          </div>
        </div>

        <div className="vision-info">
          <small>
            Frames auto-saved to %APPDATA%\ai-command-center\latest-frame.txt every 2s
          </small>
        </div>
      </div>

      <div className="vision-chat-panel">
        <div className="chat-header">
          <h3>Claude Vision</h3>
          <button className="btn btn-ghost" onClick={clearChat}>Clear</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              Start the camera and ask Claude what it sees
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                {msg.image && (
                  <img src={msg.image} alt="captured frame" className="message-image" />
                )}
                <div className="message-content">{msg.content}</div>
              </div>
            ))
          )}
          {loading && (
            <div className="chat-message assistant">
              <div className="message-content loading">Analyzing...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about what you see..."
            disabled={!cameraOn || loading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!cameraOn || loading || !inputText.trim()}
            style={{ '--accent': 'var(--accent-vision)' }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
