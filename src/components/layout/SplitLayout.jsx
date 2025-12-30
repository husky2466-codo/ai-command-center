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

  // Split view (horizontal or vertical)
  return (
    <div className="split-layout">
      <PanelGroup direction={splitDirection === 'horizontal' ? 'horizontal' : 'vertical'}>
        <Panel defaultSize={50} minSize={20}>
          <PaneContainer
            paneId={panes[0].id}
            APPS={APPS}
            apiKeys={apiKeys}
            canSplit={false}
            showCloseButton={false}
          />
        </Panel>

        <PanelResizeHandle className="resize-handle">
          <div className="resize-handle-inner" />
        </PanelResizeHandle>

        <Panel defaultSize={50} minSize={20}>
          <PaneContainer
            paneId={panes[1].id}
            APPS={APPS}
            apiKeys={apiKeys}
            canSplit={false}
            showCloseButton={true}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
