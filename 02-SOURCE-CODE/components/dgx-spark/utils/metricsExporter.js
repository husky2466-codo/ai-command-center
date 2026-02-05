/**
 * DGX Metrics Exporter
 * Handles dual export: local filesystem + remote DGX via SSH
 */

export function generateFilename(connectionId) {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  return `dgx-metrics-${connectionId}-${date}.json`;
}

export async function exportToLocal(exportData, filename) {
  try {
    const userDataPath = await window.electronAPI.getUserDataPath();
    const localPath = typeof userDataPath === 'string'
      ? userDataPath
      : userDataPath?.path || '';

    const exportDir = `${localPath}\\exports\\dgx-metrics`;
    const filePath = `${exportDir}\\${filename}`;

    const result = await window.electronAPI.writeFile(
      filePath,
      JSON.stringify(exportData, null, 2)
    );

    if (result.success) {
      return { success: true, path: filePath };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function exportToRemote(connectionId, exportData, filename, remotePath = '~/projects/exports') {
  try {
    // Ensure remote directory exists
    await window.electronAPI.dgxExecCommand(connectionId, `mkdir -p ${remotePath}`);

    const jsonContent = JSON.stringify(exportData, null, 2);
    const fullPath = `${remotePath}/${filename}`;

    const writeResult = await window.electronAPI.dgxExecCommand(
      connectionId,
      `cat > '${fullPath}' << 'METRICS_EOF'
${jsonContent}
METRICS_EOF`
    );

    if (writeResult.success || writeResult.data?.code === 0) {
      return { success: true, path: fullPath };
    } else {
      return { success: false, error: writeResult.error || 'Failed to write remote file' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function dualExport(connectionId, exportData) {
  const filename = generateFilename(connectionId);

  const [localResult, remoteResult] = await Promise.all([
    exportToLocal(exportData, filename),
    exportToRemote(connectionId, exportData, filename)
  ]);

  return {
    local: localResult,
    remote: remoteResult,
    filename
  };
}
