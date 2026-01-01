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
export default function NewOperationModal({ isOpen, onClose, connectionId, onOperationCreated }) {
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
      // Prepare operation data
      const operationData = {
        connection_id: connectionId,
        name: formData.name.trim(),
        type: formData.type,
        category: getCategoryFromType(formData.type),
        status: 'starting',
        command: formData.command.trim(),
        working_directory: formData.workingDir.trim() || '/home/myers/projects',
        port: formData.port ? parseInt(formData.port, 10) : null,
        websocket_url: formData.websocketUrl.trim() || null,
        model_name: formData.modelName.trim() || null,
        total_epochs: formData.epochs ? parseInt(formData.epochs, 10) : null,
        progress: 0,
        metadata: {
          created_via: 'ui',
          created_at: new Date().toISOString()
        }
      };

      // Create operation in database
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

      // Build command with nohup for persistence
      const workingDir = formData.workingDir.trim() || '/home/myers/projects';
      const commandToRun = buildCommand(formData, createdOperation.id);

      // Execute command on DGX
      const execResponse = await fetch(`http://localhost:3939/api/dgx/exec/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `cd ${workingDir} && ${commandToRun}`
        })
      });

      if (!execResponse.ok) {
        const errorData = await execResponse.json();
        throw new Error(errorData.error || 'Failed to execute command on DGX');
      }

      const { data: execResult } = await execResponse.json();

      // Update operation status to running
      await fetch(`http://localhost:3939/api/dgx/operations/${createdOperation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'running',
          metadata: {
            ...operationData.metadata,
            started_at: new Date().toISOString(),
            execution_output: execResult.output
          }
        })
      });

      // Success! Notify parent and close modal
      if (onOperationCreated) {
        onOperationCreated(createdOperation);
      }
      handleClose();
    } catch (err) {
      console.error('Error creating operation:', err);
      setError(err.message || 'Failed to create operation');
    } finally {
      setLoading(false);
    }
  };

  // Build persistent command with nohup
  const buildCommand = (data, operationId) => {
    const logFile = `~/projects/logs/${operationId}.log`;
    const pidFile = `~/projects/logs/${operationId}.pid`;

    // Ensure log directory exists
    const mkdirCmd = 'mkdir -p ~/projects/logs';

    // Wrap command with nohup for persistence
    const nohupCmd = `nohup ${data.command} > ${logFile} 2>&1 & echo $! > ${pidFile}`;

    return `${mkdirCmd} && ${nohupCmd}`;
  };

  // Get category from type
  const getCategoryFromType = (type) => {
    switch (type) {
      case 'server': return 'web_server';
      case 'training_job': return 'model_training';
      case 'script': return 'utility_script';
      default: return 'other';
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
