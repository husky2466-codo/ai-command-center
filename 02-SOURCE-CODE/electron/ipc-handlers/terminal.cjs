/**
 * Terminal PTY IPC Handlers
 * Channels: pty:create, pty:write, pty:resize, pty:kill
 * Local state: terminals Map, terminalIdCounter
 */

const pty = require('node-pty');

function register(ipcMain, context) {
  // Local state -- owned exclusively by this module
  const terminals = new Map();
  let terminalIdCounter = 0;

  // Create a new terminal PTY
  ipcMain.handle('pty:create', () => {
    const terminalId = ++terminalIdCounter;

    // Determine shell based on platform
    const shell = process.platform === 'win32'
      ? 'powershell.exe'
      : process.env.SHELL || '/bin/bash';

    // Set default working directory to AI Command Center project
    const defaultCwd = 'D:\\Projects\\ai-command-center';

    // Create PTY process
    // Use useConpty: false to avoid AttachConsole issues in packaged apps
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: defaultCwd,
      env: process.env,
      useConpty: process.platform === 'win32' ? false : undefined
    });

    // Store the PTY process
    terminals.set(terminalId, ptyProcess);

    // Listen to PTY output and send to renderer
    ptyProcess.onData((data) => {
      const win = context.mainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(`pty:data:${terminalId}`, data);
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal ${terminalId} exited with code ${exitCode}`);
      terminals.delete(terminalId);
      const win = context.mainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(`pty:exit:${terminalId}`, { exitCode, signal });
      }
    });

    console.log(`Created terminal ${terminalId} with shell: ${shell} in ${defaultCwd}`);
    return terminalId;
  });

  // Write data to terminal
  ipcMain.handle('pty:write', (event, terminalId, data) => {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.write(data);
      return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
  });

  // Resize terminal
  ipcMain.handle('pty:resize', (event, terminalId, cols, rows) => {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
      return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
  });

  // Kill terminal
  ipcMain.handle('pty:kill', (event, terminalId) => {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.kill();
      terminals.delete(terminalId);
      return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
  });
}

module.exports = { register };
