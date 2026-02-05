import '@testing-library/jest-dom';

// Mock window.electronAPI
global.electronAPI = {
  getUserDataPath: jest.fn().mockResolvedValue('/mock/path'),
  getApiKeys: jest.fn().mockResolvedValue({
    ANTHROPIC_API_KEY: 'mock-anthropic-key',
    OPENAI_API_KEY: 'mock-openai-key',
    HF_TOKEN: 'mock-hf-token'
  }),
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(true),
  deleteFile: jest.fn().mockResolvedValue(true),
  getRecordingsPath: jest.fn().mockResolvedValue('/mock/recordings'),
  takeScreenshot: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
  // Database mocks
  dbQuery: jest.fn().mockResolvedValue([]),
  dbRun: jest.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
  dbGet: jest.fn().mockResolvedValue(null),
  dbAll: jest.fn().mockResolvedValue([]),
  // IPC mocks
  on: jest.fn(),
  removeListener: jest.fn()
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
