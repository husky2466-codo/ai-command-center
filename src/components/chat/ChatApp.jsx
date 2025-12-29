/**
 * ChatApp.jsx - Full-featured Chat interface with Claude API integration
 * Features: Memory Lane bar, streaming responses, session management
 */

import React, { useState, useEffect, useRef } from 'react';
import MemoryLaneBar from '../shared/MemoryLaneBar.jsx';
import { chatService } from '../../services/chatService.js';
import { retrievalService } from '../../services/retrievalService.js';
import {
  Send,
  Plus,
  Trash2,
  Download,
  Settings,
  Brain,
  Sparkles
} from 'lucide-react';
import './ChatApp.css';

/**
 * Chat Application Component
 * @param {Object} apiKeys - API keys for AI providers
 */
const ChatApp = ({ apiKeys }) => {
  // Message state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Memory state
  const [relevantMemories, setRelevantMemories] = useState([]);
  const [showMemoryBar, setShowMemoryBar] = useState(true);

  // Session state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessionSidebar, setShowSessionSidebar] = useState(false);

  // Settings state
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514');
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize chat service
  useEffect(() => {
    if (apiKeys?.ANTHROPIC_API_KEY) {
      chatService.initialize(apiKeys.ANTHROPIC_API_KEY);
    }
  }, [apiKeys]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Load recent sessions on mount
  useEffect(() => {
    loadRecentSessions();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  /**
   * Load recent sessions
   */
  const loadRecentSessions = async () => {
    try {
      const recentSessions = await chatService.getRecentSessions(20);
      setSessions(recentSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  /**
   * Create a new chat session
   */
  const handleNewChat = async () => {
    try {
      const sessionId = await chatService.createSession();
      setCurrentSessionId(sessionId);
      setMessages([]);
      setRelevantMemories([]);
      setStreamingText('');
      await loadRecentSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  /**
   * Load an existing session
   */
  const handleLoadSession = async (sessionId) => {
    try {
      const sessionMessages = await chatService.loadSession(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(sessionMessages);
      setShowSessionSidebar(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  /**
   * Delete a session
   */
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    try {
      await chatService.deleteSession(sessionId);
      await loadRecentSessions();
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  /**
   * Retrieve relevant memories for current query
   */
  const retrieveMemories = async (queryText) => {
    if (!queryText || queryText.trim().length === 0) {
      return [];
    }

    try {
      // Extract potential entities from query
      const entities = await retrievalService.extractEntitiesFromQuery(queryText);

      // Perform dual retrieval
      const memories = await retrievalService.retrieveDual(queryText, entities, {
        limit: 5,
        semanticThreshold: 0.3
      });

      setRelevantMemories(memories);

      // Log recalls for each memory
      if (currentSessionId && memories.length > 0) {
        for (const memory of memories) {
          await chatService.logMemoryRecall(
            currentSessionId,
            memory.id,
            queryText,
            memory.finalScore || memory.similarity || 0
          );
        }
      }

      return memories;
    } catch (error) {
      console.error('Memory retrieval error:', error);
      return [];
    }
  };

  /**
   * Handle message send
   */
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Create session if needed
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await chatService.createSession();
      setCurrentSessionId(sessionId);
      await loadRecentSessions();
    }

    const userMessage = inputText;
    setInputText('');
    setIsLoading(true);
    setStreamingText('');

    try {
      // Save user message
      const savedUserMsg = await chatService.saveMessage(sessionId, 'user', userMessage);

      // Add to UI immediately
      setMessages(prev => [...prev, {
        id: savedUserMsg.id,
        role: 'user',
        content: userMessage,
        created_at: savedUserMsg.created_at
      }]);

      // Retrieve relevant memories
      const memories = await retrieveMemories(userMessage);

      // Send to Claude with streaming
      let fullResponse = '';

      await chatService.sendMessage(
        userMessage,
        messages,
        memories,
        // onChunk
        (chunk) => {
          fullResponse += chunk;
          setStreamingText(fullResponse);
        },
        // onComplete
        async (finalText) => {
          setStreamingText('');
          setIsLoading(false);

          // Save assistant message
          const savedAssistantMsg = await chatService.saveMessage(
            sessionId,
            'assistant',
            finalText
          );

          // Add to UI
          setMessages(prev => [...prev, {
            id: savedAssistantMsg.id,
            role: 'assistant',
            content: finalText,
            created_at: savedAssistantMsg.created_at
          }]);
        },
        // onError
        (error) => {
          console.error('Claude API error:', error);
          setIsLoading(false);
          setStreamingText('');
          alert(`Error: ${error.message}`);
        }
      );

    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      setStreamingText('');
      alert(`Error: ${error.message}`);
    }
  };

  /**
   * Handle memory feedback
   */
  const handleMemoryFeedback = async (memoryId, feedbackType) => {
    try {
      await retrievalService.submitFeedback(memoryId, currentSessionId || 'temp', feedbackType);

      // Update local state
      setRelevantMemories(prev =>
        prev.map(memory => {
          if (memory.id === memoryId) {
            return {
              ...memory,
              positive_feedback: feedbackType === 'positive'
                ? (memory.positive_feedback || 0) + 1
                : memory.positive_feedback,
              negative_feedback: feedbackType === 'negative'
                ? (memory.negative_feedback || 0) + 1
                : memory.negative_feedback
            };
          }
          return memory;
        })
      );
    } catch (error) {
      console.error('Feedback submission error:', error);
    }
  };

  /**
   * Handle input keypress
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Export conversation to markdown
   */
  const handleExport = async () => {
    if (!currentSessionId) return;

    try {
      const markdown = await chatService.exportToMarkdown(currentSessionId);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${currentSessionId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  /**
   * Clear conversation
   */
  const handleClearConversation = () => {
    if (!confirm('Clear this conversation? (Session will be saved)')) return;
    setMessages([]);
    setCurrentSessionId(null);
    setRelevantMemories([]);
    chatService.clearConversation();
  };

  // Calculate token count
  const estimatedTokens = chatService.countTokens(
    messages.reduce((acc, msg) => acc + msg.content, '') + inputText
  );

  return (
    <div className="chat-app">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <Brain className="chat-icon" size={24} />
          <h1>Chat with Claude</h1>
        </div>
        <div className="chat-header-actions">
          <button
            className="header-btn"
            onClick={() => setShowSessionSidebar(!showSessionSidebar)}
            title="Sessions"
          >
            <Sparkles size={18} />
          </button>
          <button
            className="header-btn"
            onClick={handleNewChat}
            title="New Chat"
          >
            <Plus size={18} />
          </button>
          {currentSessionId && (
            <>
              <button
                className="header-btn"
                onClick={handleExport}
                title="Export"
              >
                <Download size={18} />
              </button>
              <button
                className="header-btn danger"
                onClick={handleClearConversation}
                title="Clear"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button
            className="header-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="chat-layout">
        {/* Session Sidebar */}
        {showSessionSidebar && (
          <div className="session-sidebar">
            <div className="session-sidebar-header">
              <h3>Recent Conversations</h3>
              <button onClick={() => setShowSessionSidebar(false)}>×</button>
            </div>
            <div className="session-list">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                  onClick={() => handleLoadSession(session.id)}
                >
                  <div className="session-item-header">
                    <span className="session-title">{session.title}</span>
                    <button
                      className="session-delete"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="session-meta">
                    <span>{session.message_count} messages</span>
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  </div>
                  {session.first_message && (
                    <div className="session-preview">
                      {session.first_message.slice(0, 60)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="chat-container">
          {/* Memory Lane Bar */}
          <MemoryLaneBar
            memories={relevantMemories}
            onFeedback={handleMemoryFeedback}
            visible={showMemoryBar && relevantMemories.length > 0}
            onToggleCollapse={(collapsed) => console.log('Memory bar collapsed:', collapsed)}
          />

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && !currentSessionId && (
              <div className="chat-welcome">
                <h2>AI Command Center Chat</h2>
                <p>Chat with Claude powered by your Memory Lane system</p>
                <div className="chat-features">
                  <div className="feature">
                    <Brain size={24} className="feature-icon" />
                    <span>Memory Retrieval</span>
                  </div>
                  <div className="feature">
                    <Sparkles size={24} className="feature-icon" />
                    <span>Streaming Responses</span>
                  </div>
                  <div className="feature">
                    <Settings size={24} className="feature-icon" />
                    <span>Session History</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`message message-${message.role}`}>
                <div className="message-header">
                  <span className="message-role">
                    {message.role === 'user' ? 'You' : 'Claude'}
                  </span>
                  <span className="message-time">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {isLoading && streamingText && (
              <div className="message message-assistant streaming">
                <div className="message-header">
                  <span className="message-role">Claude</span>
                  <span className="message-time">streaming...</span>
                </div>
                <div className="message-content">
                  {streamingText}
                  <span className="cursor-blink">▊</span>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !streamingText && (
              <div className="message message-assistant loading">
                <div className="message-header">
                  <span className="message-role">Claude</span>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="settings-panel">
              <h3>Settings</h3>
              <div className="setting-item">
                <label>Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    chatService.setModel(e.target.value);
                  }}
                >
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                  <option value="claude-opus-4-20250514">Claude Opus 4</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                </select>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={showMemoryBar}
                    onChange={(e) => setShowMemoryBar(e.target.checked)}
                  />
                  Show Memory Lane
                </label>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder="Ask me anything..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                disabled={isLoading}
              />
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="chat-input-footer">
              <span className="token-count">
                {estimatedTokens > 0 && `~${estimatedTokens} tokens`}
              </span>
              <span className="model-name">{selectedModel.split('-')[1]?.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
