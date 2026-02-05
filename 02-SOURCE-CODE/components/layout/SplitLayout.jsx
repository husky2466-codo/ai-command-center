import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLayout } from './LayoutContext';
import PaneContainer from './PaneContainer';
import './layout.css';

export default function SplitLayout({ APPS, apiKeys }) {
  const { panes, splitDirection } = useLayout();

  // Single pane view
  if (panes.length === 1) {
    return (
      <div className="split-layout">
        <PaneContainer
          paneId={panes[0].id}
          APPS={APPS}
          apiKeys={apiKeys}
          canSplit={true}
          showCloseButton={false}
        />
      </div>
    );
  }

  // Multi-pane split view (2+ panes)
  // Calculate default size for each pane (equal distribution)
  const defaultSize = 100 / panes.length;

  return (
    <div className="split-layout">
      <PanelGroup direction={splitDirection === 'horizontal' ? 'horizontal' : 'vertical'}>
        {panes.map((pane, index) => (
          <React.Fragment key={pane.id}>
            <Panel defaultSize={defaultSize} minSize={15}>
              <PaneContainer
                paneId={pane.id}
                APPS={APPS}
                apiKeys={apiKeys}
                canSplit={true}
                showCloseButton={panes.length > 1}
              />
            </Panel>

            {/* Add resize handle between panes (but not after the last one) */}
            {index < panes.length - 1 && (
              <PanelResizeHandle className="resize-handle">
                <div className="resize-handle-inner" />
              </PanelResizeHandle>
            )}
          </React.Fragment>
        ))}
      </PanelGroup>
    </div>
  );
}
