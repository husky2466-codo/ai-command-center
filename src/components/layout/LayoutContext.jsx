import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LayoutContext = createContext();

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return context;
}

export function LayoutProvider({ children }) {
  // Layout configuration
  const [panes, setPanes] = useState(() => {
    const saved = localStorage.getItem('ai-command-center-layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.panes || [{ id: 'pane-1', tabs: [], activeTabId: null }];
      } catch (e) {
        console.error('Failed to parse saved layout:', e);
      }
    }
    return [{ id: 'pane-1', tabs: [], activeTabId: null }];
  });

  const [splitDirection, setSplitDirection] = useState(() => {
    const saved = localStorage.getItem('ai-command-center-layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.splitDirection || null;
      } catch (e) {
        console.error('Failed to parse saved layout:', e);
      }
    }
    return null;
  });

  // Save to localStorage whenever layout changes
  useEffect(() => {
    const layoutState = {
      panes: panes.map(pane => ({
        id: pane.id,
        tabs: pane.tabs.map(tab => ({ id: tab.id, appId: tab.appId })),
        activeTabId: pane.activeTabId
      })),
      splitDirection
    };
    localStorage.setItem('ai-command-center-layout', JSON.stringify(layoutState));
  }, [panes, splitDirection]);

  // Open app in specific pane
  const openAppInPane = useCallback((paneId, appData) => {
    setPanes(prevPanes => {
      return prevPanes.map(pane => {
        if (pane.id === paneId) {
          // Check if tab already exists
          const existingTab = pane.tabs.find(t => t.appId === appData.id);
          if (existingTab) {
            return { ...pane, activeTabId: existingTab.id };
          }

          // Create new tab
          const newTab = {
            id: `${appData.id}-${Date.now()}`,
            appId: appData.id,
            ...appData,
          };
          return {
            ...pane,
            tabs: [...pane.tabs, newTab],
            activeTabId: newTab.id
          };
        }
        return pane;
      });
    });
  }, []);

  // Close tab in specific pane
  const closeTabInPane = useCallback((paneId, tabId) => {
    setPanes(prevPanes => {
      return prevPanes.map(pane => {
        if (pane.id === paneId) {
          const tabIndex = pane.tabs.findIndex(t => t.id === tabId);
          const newTabs = pane.tabs.filter(t => t.id !== tabId);

          let newActiveTabId = pane.activeTabId;
          if (pane.activeTabId === tabId) {
            if (newTabs.length === 0) {
              newActiveTabId = null;
            } else {
              const newIndex = Math.min(tabIndex, newTabs.length - 1);
              newActiveTabId = newTabs[newIndex].id;
            }
          }

          return {
            ...pane,
            tabs: newTabs,
            activeTabId: newActiveTabId
          };
        }
        return pane;
      });
    });
  }, []);

  // Set active tab in specific pane
  const setActiveTabInPane = useCallback((paneId, tabId) => {
    setPanes(prevPanes => {
      return prevPanes.map(pane => {
        if (pane.id === paneId) {
          return { ...pane, activeTabId: tabId };
        }
        return pane;
      });
    });
  }, []);

  // Split pane
  const splitPane = useCallback((direction) => {
    if (panes.length >= 2) {
      console.warn('Maximum 2 panes supported');
      return;
    }

    setPanes(prevPanes => [
      ...prevPanes,
      { id: `pane-${Date.now()}`, tabs: [], activeTabId: null }
    ]);
    setSplitDirection(direction);
  }, [panes.length]);

  // Close pane
  const closePane = useCallback((paneId) => {
    if (panes.length <= 1) {
      console.warn('Cannot close the last pane');
      return;
    }

    setPanes(prevPanes => prevPanes.filter(pane => pane.id !== paneId));

    // If only one pane left, clear split direction
    if (panes.length === 2) {
      setSplitDirection(null);
    }
  }, [panes.length]);

  // Get pane by ID
  const getPane = useCallback((paneId) => {
    return panes.find(pane => pane.id === paneId);
  }, [panes]);

  // Close all tabs in a specific pane
  const closeAllTabsInPane = useCallback((paneId) => {
    setPanes(prevPanes => {
      return prevPanes.map(pane => {
        if (pane.id === paneId) {
          return {
            ...pane,
            tabs: [],
            activeTabId: null
          };
        }
        return pane;
      });
    });
  }, []);

  const value = {
    panes,
    splitDirection,
    openAppInPane,
    closeTabInPane,
    setActiveTabInPane,
    splitPane,
    closePane,
    getPane,
    closeAllTabsInPane,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}
