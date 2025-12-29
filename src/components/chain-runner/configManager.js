/**
 * Chain Runner Configuration Manager
 * Handles saving, loading, listing, and deleting chain configurations
 */

/**
 * Save current chain configuration
 */
export async function saveChainConfig(config, name, electronAPI) {
  if (!electronAPI) {
    return { success: false, error: 'Electron API not available' };
  }

  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const configPath = `${userDataPath}\\chain-configs`;
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const sanitizedName = name.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedName}_${timestamp}.json`;

    const configData = {
      name,
      createdAt: new Date().toISOString(),
      ...config
    };

    const result = await electronAPI.writeFile(
      `${configPath}\\${filename}`,
      JSON.stringify(configData, null, 2)
    );

    return result.success
      ? { success: true, filename }
      : { success: false, error: result.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * List all saved configurations
 */
export async function listChainConfigs(electronAPI) {
  if (!electronAPI) {
    return { success: false, error: 'Electron API not available' };
  }

  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const configPath = `${userDataPath}\\chain-configs`;

    const result = await electronAPI.listDirectory(configPath);
    if (!result.success) {
      return { success: true, configs: [] };
    }

    const configs = [];
    for (const filename of result.files.filter(f => f.endsWith('.json'))) {
      try {
        const fileResult = await electronAPI.readFile(`${configPath}\\${filename}`);
        if (fileResult.success) {
          const data = JSON.parse(fileResult.content);
          configs.push({ filename, ...data });
        }
      } catch (e) {
        console.error(`Failed to load config ${filename}:`, e);
      }
    }

    // Sort by date, newest first
    configs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { success: true, configs };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Load a specific configuration
 */
export async function loadChainConfig(filename, electronAPI) {
  if (!electronAPI) {
    return { success: false, error: 'Electron API not available' };
  }

  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const filePath = `${userDataPath}\\chain-configs\\${filename}`;

    const result = await electronAPI.readFile(filePath);
    if (result.success) {
      const config = JSON.parse(result.content);
      return { success: true, config };
    }
    return { success: false, error: result.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a configuration
 */
export async function deleteChainConfig(filename, electronAPI) {
  if (!electronAPI) {
    return { success: false, error: 'Electron API not available' };
  }

  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const filePath = `${userDataPath}\\chain-configs\\${filename}`;

    const result = await electronAPI.deleteFile(filePath);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}
