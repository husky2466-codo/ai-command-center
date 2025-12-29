import React, { useState } from 'react';
import { Search, Mail, Save, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import Card from './Card';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Badge from './Badge';
import './ComponentShowcase.css';

/**
 * Component Showcase
 *
 * Demonstrates all shared components with various configurations.
 * Useful for testing and as living documentation.
 */
function ComponentShowcase() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowModal(false);
    }, 2000);
  };

  return (
    <div className="showcase">
      <div className="showcase-header">
        <h1>AI Command Center - Component Library</h1>
        <p>Shared UI components with dark theme and gold accents</p>
      </div>

      <div className="showcase-grid">
        {/* Buttons Section */}
        <Card title="Buttons" subtitle="Variants and sizes">
          <div className="showcase-section">
            <h4>Primary (Gold)</h4>
            <div className="showcase-row">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>

            <h4>Secondary (Outlined)</h4>
            <div className="showcase-row">
              <Button variant="secondary" size="sm">Small</Button>
              <Button variant="secondary" size="md">Medium</Button>
              <Button variant="secondary" size="lg">Large</Button>
            </div>

            <h4>Ghost</h4>
            <div className="showcase-row">
              <Button variant="ghost" size="sm">Small</Button>
              <Button variant="ghost" size="md">Medium</Button>
              <Button variant="ghost" size="lg">Large</Button>
            </div>

            <h4>Danger</h4>
            <div className="showcase-row">
              <Button variant="danger">Delete</Button>
              <Button variant="danger" disabled>Disabled</Button>
            </div>

            <h4>With Icons</h4>
            <div className="showcase-row">
              <Button variant="primary" icon={<Save />}>Save</Button>
              <Button variant="secondary" icon={<Search />}>Search</Button>
              <Button variant="primary" iconRight={<Zap />}>Execute</Button>
            </div>

            <h4>Loading States</h4>
            <div className="showcase-row">
              <Button variant="primary" loading>Loading...</Button>
              <Button variant="secondary" loading>Processing</Button>
            </div>
          </div>
        </Card>

        {/* Inputs Section */}
        <Card title="Inputs" subtitle="Form fields with validation">
          <div className="showcase-section">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail />}
              hint="We'll never share your email"
              fullWidth
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />

            <Input
              label="Search"
              type="search"
              placeholder="Search..."
              icon={<Search />}
              fullWidth
            />

            <Input
              label="With Error"
              type="text"
              placeholder="Invalid input"
              error="This field is required"
              fullWidth
            />

            <Input
              label="Disabled"
              type="text"
              placeholder="Cannot edit"
              disabled
              fullWidth
            />
          </div>
        </Card>

        {/* Badges Section */}
        <Card title="Badges" subtitle="Status indicators and labels">
          <div className="showcase-section">
            <h4>Status Badges</h4>
            <div className="showcase-row">
              <Badge variant="success" icon={<CheckCircle size={12} />}>Success</Badge>
              <Badge variant="warning" icon={<AlertCircle size={12} />}>Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>

            <h4>Memory Types</h4>
            <div className="showcase-row">
              <Badge variant="memory-correction" size="sm">Correction</Badge>
              <Badge variant="memory-decision" size="sm">Decision</Badge>
              <Badge variant="memory-insight" size="sm">Insight</Badge>
              <Badge variant="memory-learning" size="sm">Learning</Badge>
            </div>

            <h4>Hexagon Variant</h4>
            <div className="showcase-row">
              <Badge variant="memory-correction" hexagon>Correction</Badge>
              <Badge variant="memory-decision" hexagon>Decision</Badge>
              <Badge variant="memory-insight" hexagon>Insight</Badge>
            </div>

            <h4>Energy Types</h4>
            <div className="showcase-row">
              <Badge variant="energy-quick-win">Quick Win</Badge>
              <Badge variant="energy-deep-work">Deep Work</Badge>
              <Badge variant="energy-creative">Creative</Badge>
              <Badge variant="energy-people">People</Badge>
            </div>

            <h4>Freshness Indicators</h4>
            <div className="showcase-row">
              <Badge variant="freshness-hot">Hot (0-7d)</Badge>
              <Badge variant="freshness-warm">Warm (8-30d)</Badge>
              <Badge variant="freshness-cool">Cool (31-90d)</Badge>
              <Badge variant="freshness-cold">Cold (90d+)</Badge>
            </div>
          </div>
        </Card>

        {/* Cards Section */}
        <Card title="Card Variants" subtitle="Different card styles">
          <div className="showcase-section">
            <Card variant="default" padding="sm">
              <p>Default card with small padding</p>
            </Card>

            <Card variant="elevated" title="Elevated Card">
              <p>Card with stronger shadow for emphasis</p>
            </Card>

            <Card
              variant="outlined"
              title="Outlined Card"
              subtitle="With actions"
              actions={
                <>
                  <Button variant="ghost" size="sm">Cancel</Button>
                  <Button variant="primary" size="sm">Save</Button>
                </>
              }
            >
              <p>Card with emphasized border and footer actions</p>
            </Card>

            <Card
              hoverable
              onClick={() => alert('Card clicked!')}
              title="Clickable Card"
            >
              <p>Hover over this card to see the effect</p>
            </Card>
          </div>
        </Card>

        {/* Modal Section */}
        <Card title="Modal" subtitle="Overlay dialogs">
          <div className="showcase-section">
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Open Modal
            </Button>

            <Modal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title="Example Modal"
              size="medium"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSubmit} loading={loading}>
                    Submit
                  </Button>
                </>
              }
            >
              <p>This is a modal dialog with a backdrop, close button, and footer actions.</p>
              <p>Press ESC to close, or click the backdrop.</p>

              <Input
                label="Modal Input"
                placeholder="Enter something..."
                fullWidth
              />
            </Modal>
          </div>
        </Card>

        {/* Full Width Examples */}
        <Card title="Responsive Examples" subtitle="Full-width components">
          <div className="showcase-section">
            <Button variant="primary" fullWidth>Full Width Button</Button>
            <Button variant="secondary" fullWidth icon={<Save />}>
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ComponentShowcase;
