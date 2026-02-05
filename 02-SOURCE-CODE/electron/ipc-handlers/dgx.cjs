/**
 * DGX Spark SSH IPC Handlers
 * Channels: dgx:connect, dgx:disconnect, dgx:check-status, dgx:exec-command,
 *           dgx:get-command-history, dgx:get-metrics, dgx:start-monitoring,
 *           dgx:stop-monitoring, dgx:start-tunnel, dgx:stop-tunnel, dgx:list-containers
 *
 * BUG FIX: Original main.cjs referenced undeclared `dgxConnections` variable in
 * dgx:start-tunnel, dgx:stop-tunnel, dgx:list-containers. Fixed to use
 * context.dgxManager.dgxConnections instead.
 */

function register(ipcMain, context) {
  const { dgxManager, operationMonitor } = context;

  // Connect to DGX server via SSH
  ipcMain.handle('dgx:connect', async (event, config) => {
    return await dgxManager.connectToDGX(config);
  });

  // Disconnect from DGX server
  ipcMain.handle('dgx:disconnect', async (event, connectionId) => {
    return await dgxManager.disconnectFromDGX(connectionId);
  });

  // Check connection status
  ipcMain.handle('dgx:check-status', async (event, connectionId) => {
    return dgxManager.getConnectionStatus(connectionId);
  });

  // Execute command on DGX server
  ipcMain.handle('dgx:exec-command', async (event, connectionId, command) => {
    // dgxManager.executeCommand will emit the event via dgxEvents
    return await dgxManager.executeCommand(connectionId, command);
  });

  // Get command history
  ipcMain.handle('dgx:get-command-history', async () => {
    return { success: true, data: dgxManager.commandHistory || [] };
  });

  // Get GPU metrics from nvidia-smi
  ipcMain.handle('dgx:get-metrics', async (event, connectionId) => {
    return await dgxManager.getGPUMetrics(connectionId);
  });

  // Start operation monitoring for a connection
  ipcMain.handle('dgx:start-monitoring', async (event, connectionId) => {
    operationMonitor.startMonitoring(connectionId);
    return { success: true };
  });

  // Stop operation monitoring for a connection
  ipcMain.handle('dgx:stop-monitoring', async (event, connectionId) => {
    operationMonitor.stopMonitoring(connectionId);
    return { success: true };
  });

  // Start port forwarding tunnel
  // BUG FIX: was `dgxConnections.get(...)` -- now `dgxManager.dgxConnections.get(...)`
  ipcMain.handle('dgx:start-tunnel', async (event, connectionId, localPort, remotePort) => {
    try {
      const ssh = dgxManager.dgxConnections.get(connectionId);
      if (!ssh || !ssh.isConnected()) {
        return { success: false, error: 'Not connected' };
      }

      // Forward local port to remote port
      await ssh.forwardOut(
        '127.0.0.1',
        localPort,
        '127.0.0.1',
        remotePort
      );

      console.log(`[Main] Port forwarding started: ${localPort} -> ${remotePort}`);
      return { success: true, data: { localPort, remotePort } };
    } catch (error) {
      console.error('[Main] dgx:start-tunnel error:', error.message);
      return { success: false, error: 'Failed to start tunnel' };
    }
  });

  // Stop port forwarding tunnel
  // BUG FIX: was `dgxConnections.get(...)` -- now `dgxManager.dgxConnections.get(...)`
  ipcMain.handle('dgx:stop-tunnel', async (event, connectionId) => {
    try {
      const ssh = dgxManager.dgxConnections.get(connectionId);
      if (!ssh) {
        return { success: false, error: 'Connection not found' };
      }

      // Note: node-ssh doesn't provide a direct way to stop individual tunnels
      // This would typically require tracking tunnel handles separately
      // For now, we'll just acknowledge the request
      console.log(`[Main] Tunnel stop requested for: ${connectionId}`);
      return { success: true, data: {} };
    } catch (error) {
      console.error('[Main] dgx:stop-tunnel error:', error.message);
      return { success: false, error: 'Failed to stop tunnel' };
    }
  });

  // List Docker containers
  // BUG FIX: was `dgxConnections.get(...)` -- now `dgxManager.dgxConnections.get(...)`
  ipcMain.handle('dgx:list-containers', async (event, connectionId) => {
    try {
      const ssh = dgxManager.dgxConnections.get(connectionId);
      if (!ssh || !ssh.isConnected()) {
        return { success: false, error: 'Not connected' };
      }

      const command = "docker ps --format '{{.ID}}\\t{{.Names}}\\t{{.Status}}\\t{{.Image}}'";
      const result = await ssh.execCommand(command);

      if (result.code !== 0) {
        return { success: false, error: 'Docker command failed' };
      }

      // Parse output
      const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);
      const containers = lines.map(line => {
        const [id, name, status, image] = line.split('\t');
        return {
          id: id || '',
          name: name || '',
          status: status || '',
          image: image || ''
        };
      });

      return { success: true, data: { containers } };
    } catch (error) {
      console.error('[Main] dgx:list-containers error:', error.message);
      return { success: false, error: 'Failed to list containers' };
    }
  });
}

module.exports = { register };
