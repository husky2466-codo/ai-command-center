import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Server, Brain, Terminal, FolderOpen } from 'lucide-react';
import Modal from '../../shared/Modal';
import Input from '../../shared/Input';
import Button from '../../shared/Button';
import './NewOperationModal.css';

/**
 * New Operation Modal
 * Create and launch new operations on the DGX (servers, training jobs, scripts)
 */
export default function NewOperationModal({ isOpen, onClose, connectionId, hostname, onOperationCreated }) {
  const [formData, setFormData] = useState({
    type: 'server',
    name: '',
    command: '',
    workingDir: '/home/myers/projects',
    port: '',
    websocketUrl: '',
    modelName: '',
    epochs: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error on input
  };

  // Reset form when modal opens/closes
  const handleClose = () => {
    setFormData({
      type: 'server',
      name: '',
      command: '',
      workingDir: '/home/myers/projects',
      port: '',
      websocketUrl: '',
      modelName: '',
      epochs: ''
    });
    setError('');
    setLoading(false);
    onClose();
  };

  // Validate form
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Operation name is required');
      return false;
    }
    if (!formData.command.trim()) {
      setError('Command is required');
      return false;
    }
    if (formData.type === 'server' && !formData.port) {
      setError('Port is required for servers');
      return false;
    }
    if (formData.type === 'training_job' && !formData.modelName.trim()) {
      setError('Model name is required for training jobs');
      return false;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Step 1: Create operation in database with pending status
      const operationData = {
        connection_id: connectionId,
        name: formData.name.trim(),
        type: formData.type === 'training_job' ? 'job' : formData.type,
        category: formData.type === 'training_job' ? 'training' :
                  formData.type === 'server' ? 'webui' : 'script',
        status: 'pending',
        command: formData.command.trim(),
        port: formData.port ? parseInt(formData.port, 10) : null,
        websocket_url: formData.websocketUrl.trim() || null,
        progress: -1 // indeterminate until we get real progress
      };

      const createResponse = await fetch('http://localhost:3939/api/dgx/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operationData)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create operation');
      }

      const { data: createdOperation } = await createResponse.json();
      const operationId = createdOperation.id;
      const logFile = `/tmp/op_${operationId}.log`;

      // Step 2: Execute command on DGX via exec API
      const workingDir = formData.workingDir.trim() || '~';
      const execCommand = `cd ${workingDir} && nohup ${formData.command.trim()} > ${logFile} 2>&1 & echo $!`;

      const execResponse = await fetch(`http://localhost:3939/api/dgx/exec/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: execCommand })
      });

      if (!execResponse.ok) {
        const errorData = await execResponse.json();
        // Update operation to failed status
        await fetch(`http://localhost:3939/api/dgx/operations/${operationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed' })
        });
        throw new Error(errorData.error || 'Failed to execute command on DGX');
      }

      const { data: execResult } = await execResponse.json();

      // Step 3: Parse PID from stdout and update operation
      const stdout = execResult.stdout || execResult.output || '';
      const pid = parseInt(stdout.trim(), 10);

      const updateData = {
        status: 'running',
        log_file: logFile
      };

      // Only set PID if we got a valid number
      if (!isNaN(pid) && pid > 0) {
        updateData.pid = pid;
      }

      // Build URL for servers using the connection's hostname
      if (formData.type === 'server' && formData.port) {
        const host = hostname || '192.168.3.20';
        updateData.url = `http://${host}:${formData.port}`;
      }

      await fetch(`http://localhost:3939/api/dgx/operations/${operationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Success! Notify parent and close modal
      if (onOperationCreated) {
        onOperationCreated({ ...createdOperation, ...updateData });
      }
      handleClose();
    } catch (err) {
      console.error('Error creating operation:', err);
      setError(err.message || 'Failed to create operation');
    } finally {
      setLoading(false);
    }
  };


  // Browse for directory (future: could integrate with file picker)
  const handleBrowseDirectory = () => {
    // For now, just show common directories as hint
    const commonDirs = [
      '/home/myers/projects',
      '/home/myers/projects/training',
      '/home/myers/projects/inference',
      '/home/myers/projects/data'
    ];
    alert('Common directories:\n' + commonDirs.join('\n'));
  };

  // Render form fields based on type
  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'server':
        return (
          <>
            <Input
              label="Port"
              type="number"
              value={formData.port}
              onChange={(e) => updateField('port', e.target.value)}
              placeholder="8188"
              required
              fullWidth
              hint="Port number the server will listen on"
            />
            <Input
              label="WebSocket URL (Optional)"
              type="url"
              value={formData.websocketUrl}
              onChange={(e) => updateField('websocketUrl', e.target.value)}
              placeholder="ws://localhost:8188"
              fullWidth
              hint="WebSocket endpoint if server supports it"
            />
          </>
        );

      case 'training_job':
        return (
          <>
            <Input
              label="Model Name"
              type="text"
              value={formData.modelName}
              onChange={(e) => updateField('modelName', e.target.value)}
              placeholder="vit_base_patch16_224"
              required
              fullWidth
              hint="Name of the model being trained"
            />
            <Input
              label="Total Epochs (Optional)"
              type="number"
              value={formData.epochs}
              onChange={(e) => updateField('epochs', e.target.value)}
              placeholder="100"
              fullWidth
              hint="Used for progress tracking (current/total epochs)"
            />
          </>
        );

      case 'script':
        return (
          <div className="form-hint">
            <Terminal size={16} />
            <span>Scripts run once and exit. Use Server type for long-running processes.</span>
          </div>
        );

      default:
        return null;
    }
  };

  const footer = (
    <div className="modal-footer-buttons">
      <Button variant="ghost" onClick={handleClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        loading={loading}
        icon={getTypeIcon(formData.type)}
      >
        Create & Launch
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Operation"
      footer={footer}
      size="medium"
    >
      <form className="new-operation-form" onSubmit={handleSubmit}>
        {/* Error Display */}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {/* Operation Type Selector */}
        <div className="form-group">
          <label className="form-label">Operation Type *</label>
          <div className="type-selector">
            <button
              type="button"
              className={`type-option ${formData.type === 'server' ? 'active' : ''}`}
              onClick={() => updateField('type', 'server')}
            >
              <Server size={20} />
              <span>Server</span>
            </button>
            <button
              type="button"
              className={`type-option ${formData.type === 'training_job' ? 'active' : ''}`}
              onClick={() => updateField('type', 'training_job')}
            >
              <Brain size={20} />
              <span>Training Job</span>
            </button>
            <button
              type="button"
              className={`type-option ${formData.type === 'script' ? 'active' : ''}`}
              onClick={() => updateField('type', 'script')}
            >
              <Terminal size={20} />
              <span>Script/Program</span>
            </button>
          </div>
        </div>

        {/* Common Fields */}
        <Input
          label="Operation Name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder={getPlaceholderName(formData.type)}
          required
          fullWidth
          hint="Descriptive name for this operation"
        />

        <Input
          label="Command"
          type="text"
          value={formData.command}
          onChange={(e) => updateField('command', e.target.value)}
          placeholder={getPlaceholderCommand(formData.type)}
          required
          fullWidth
          hint="Command to execute (will be wrapped with nohup for persistence)"
        />

        <div className="form-group">
          <Input
            label="Working Directory"
            type="text"
            value={formData.workingDir}
            onChange={(e) => updateField('workingDir', e.target.value)}
            placeholder="/home/myers/projects"
            fullWidth
            hint="Directory to run command from"
            iconRight={<FolderOpen size={16} style={{ cursor: 'pointer' }} onClick={handleBrowseDirectory} />}
          />
        </div>

        {/* Type-Specific Fields */}
        <div className="type-specific-fields">
          {renderTypeSpecificFields()}
        </div>
      </form>
    </Modal>
  );
}

NewOperationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  connectionId: PropTypes.string.isRequired,
  hostname: PropTypes.string,
  onOperationCreated: PropTypes.func
};

// Helper functions
function getTypeIcon(type) {
  switch (type) {
    case 'server': return <Server size={18} />;
    case 'training_job': return <Brain size={18} />;
    case 'script': return <Terminal size={18} />;
    default: return null;
  }
}

function getPlaceholderName(type) {
  switch (type) {
    case 'server': return 'ComfyUI Server';
    case 'training_job': return 'ViT Training Run 1';
    case 'script': return 'Data Preprocessing';
    default: return 'My Operation';
  }
}

function getPlaceholderCommand(type) {
  switch (type) {
    case 'server': return 'python main.py --listen 0.0.0.0 --port 8188';
    case 'training_job': return 'python train.py --model vit --epochs 100';
    case 'script': return 'python preprocess_data.py';
    default: return 'python script.py';
  }
}
