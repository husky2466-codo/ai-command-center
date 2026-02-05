/**
 * Terminal Routes
 * POST /api/terminal/exec - Execute a shell command
 * GET /api/terminal/cwd - Get current working directory
 */

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const router = express.Router();

// Execute shell command
router.post('/exec', async (req, res) => {
  try {
    const { command, cwd, timeout = 30000 } = req.body;

    if (!command) {
      return res.status(400).json({ success: false, error: 'command is required' });
    }

    // Security: Block dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+[\/\\]/i,
      /format\s+[a-z]:/i,
      /del\s+\/[sq]/i,
      /rmdir\s+\/s/i,
      />>\s*\/etc/i,
      /mkfs/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return res.status(403).json({
          success: false,
          error: 'Command blocked for security reasons'
        });
      }
    }

    const options = {
      cwd: cwd || process.cwd(),
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      windowsHide: true
    };

    const { stdout, stderr } = await execAsync(command, options);

    res.json({
      success: true,
      data: {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
        cwd: options.cwd
      }
    });
  } catch (error) {
    // exec errors include exit code
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
        code: error.code,
        killed: error.killed
      }
    });
  }
});

// Get current working directory
router.get('/cwd', (req, res) => {
  res.json({ success: true, data: { cwd: process.cwd() } });
});

module.exports = router;
