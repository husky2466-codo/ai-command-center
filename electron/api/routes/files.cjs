/**
 * Files Routes - File System API for AI Command Center
 *
 * POST /api/files/read - Read file content
 * POST /api/files/write - Write file content
 * DELETE /api/files/delete - Delete a file
 * POST /api/files/list - List directory contents
 * POST /api/files/exists - Check if file exists
 *
 * Security:
 * - Only allows access to userData directory and projects folder
 * - Rejects path traversal attempts (..)
 * - All operations are logged
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const logger = require('../../utils/logger.cjs');

const router = express.Router();

// Allowed base directories for file operations
function getAllowedPaths() {
  const userDataPath = app.getPath('userData');
  const projectsPath = 'D:\\Projects';

  return [userDataPath, projectsPath];
}

/**
 * Validate that a path is within allowed directories and has no traversal
 * @param {string} filePath - The path to validate
 * @returns {object} { valid: boolean, error?: string, normalizedPath?: string }
 */
function validatePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'Path is required and must be a string' };
  }

  // Normalize the path to resolve any relative components
  const normalizedPath = path.normalize(filePath);

  // Check for path traversal attempts
  if (filePath.includes('..') || normalizedPath.includes('..')) {
    logger.warn('Path traversal attempt blocked', { originalPath: filePath, normalizedPath });
    return { valid: false, error: 'Path traversal (..) is not allowed' };
  }

  // Check if path is within allowed directories
  const allowedPaths = getAllowedPaths();
  const isAllowed = allowedPaths.some(allowedPath => {
    const normalizedAllowed = path.normalize(allowedPath);
    return normalizedPath.toLowerCase().startsWith(normalizedAllowed.toLowerCase());
  });

  if (!isAllowed) {
    logger.warn('Access to unauthorized path blocked', { path: normalizedPath, allowedPaths });
    return {
      valid: false,
      error: `Access denied. Path must be within: ${allowedPaths.join(' or ')}`
    };
  }

  return { valid: true, normalizedPath };
}

/**
 * POST /api/files/read
 * Read file content
 * Body: { path: string }
 */
router.post('/read', async (req, res) => {
  try {
    const { path: filePath } = req.body;

    const validation = validatePath(filePath);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const content = await fs.readFile(validation.normalizedPath, 'utf-8');

    logger.info('File read', { path: validation.normalizedPath, size: content.length });

    res.json({
      success: true,
      data: {
        content,
        encoding: 'utf-8'
      }
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    if (err.code === 'EISDIR') {
      return res.status(400).json({
        success: false,
        error: 'Path is a directory, not a file'
      });
    }
    logger.error('File read error', { error: err.message, path: req.body.path });
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/files/write
 * Write file content
 * Body: { path: string, content: string, encoding?: string }
 */
router.post('/write', async (req, res) => {
  try {
    const { path: filePath, content, encoding = 'utf-8' } = req.body;

    if (content === undefined || content === null) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const validation = validatePath(filePath);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(validation.normalizedPath);
    await fs.mkdir(parentDir, { recursive: true });

    await fs.writeFile(validation.normalizedPath, content, encoding);

    const stats = await fs.stat(validation.normalizedPath);

    logger.info('File written', { path: validation.normalizedPath, bytesWritten: stats.size });

    res.json({
      success: true,
      data: {
        bytesWritten: stats.size
      }
    });
  } catch (err) {
    logger.error('File write error', { error: err.message, path: req.body.path });
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/files/delete
 * Delete a file
 * Body: { path: string }
 */
router.delete('/delete', async (req, res) => {
  try {
    const { path: filePath } = req.body;

    const validation = validatePath(filePath);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Check if file exists first
    try {
      await fs.access(validation.normalizedPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check if it's a file (not a directory)
    const stats = await fs.stat(validation.normalizedPath);
    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a directory with this endpoint. Path must be a file.'
      });
    }

    await fs.unlink(validation.normalizedPath);

    logger.info('File deleted', { path: validation.normalizedPath });

    res.json({
      success: true
    });
  } catch (err) {
    logger.error('File delete error', { error: err.message, path: req.body.path });
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/files/list
 * List directory contents
 * Body: { path: string }
 */
router.post('/list', async (req, res) => {
  try {
    const { path: dirPath } = req.body;

    const validation = validatePath(dirPath);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Check if path exists
    try {
      await fs.access(validation.normalizedPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Directory not found'
      });
    }

    // Check if it's a directory
    const stats = await fs.stat(validation.normalizedPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Path is not a directory'
      });
    }

    const entries = await fs.readdir(validation.normalizedPath, { withFileTypes: true });

    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(validation.normalizedPath, entry.name);
        try {
          const entryStats = await fs.stat(entryPath);
          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: entryStats.size,
            modified: entryStats.mtime.toISOString()
          };
        } catch {
          // If we can't stat the file, return basic info
          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: 0,
            modified: null
          };
        }
      })
    );

    logger.info('Directory listed', { path: validation.normalizedPath, count: files.length });

    res.json({
      success: true,
      data: {
        files
      }
    });
  } catch (err) {
    logger.error('Directory list error', { error: err.message, path: req.body.path });
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/files/exists
 * Check if file exists
 * Body: { path: string }
 */
router.post('/exists', async (req, res) => {
  try {
    const { path: filePath } = req.body;

    const validation = validatePath(filePath);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    let exists = false;
    let isDirectory = false;

    try {
      const stats = await fs.stat(validation.normalizedPath);
      exists = true;
      isDirectory = stats.isDirectory();
    } catch {
      exists = false;
      isDirectory = false;
    }

    logger.debug('File exists check', { path: validation.normalizedPath, exists, isDirectory });

    res.json({
      success: true,
      data: {
        exists,
        isDirectory
      }
    });
  } catch (err) {
    logger.error('File exists check error', { error: err.message, path: req.body.path });
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
