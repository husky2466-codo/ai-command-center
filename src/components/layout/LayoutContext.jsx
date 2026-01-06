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

  // Split pane - now supports splitting any existing pane
  const splitPane = useCallback((paneId, direction) => {
    const maxPanes = 6; // Reasonable limit for usability
    if (panes.length >= maxPanes) {
      console.warn(`Maximum ${maxPanes} panes supported`);
      return;
    }

    // Find the pane to split
    const paneIndex = panes.findIndex(p => p.id === paneId);
    if (paneIndex === -1) {
      console.error('Pane not found:', paneId);
      return;
    }

    // Create new pane
    const newPane = { id: `pane-${Date.now()}`, tabs: [], activeTabId: null };

    // Insert new pane after the pane being split
    setPanes(prevPanes => {
      const updated = [...prevPanes];
      updated.splice(paneIndex + 1, 0, newPane);
      return updated;
    });

    // Update split direction if this is the first split
    if (panes.length === 1) {
      setSplitDirection(direction);
    }
  }, [panes]);

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

  // Move tab from one pane to another
  const moveTab = useCallback((fromPaneId, toPaneId, tabId) => {
    // Don't move if source and destination are the same
    if (fromPaneId === toPaneId) return;

    setPanes(prevPanes => {
      const fromPane = prevPanes.find(p => p.id === fromPaneId);
      if (!fromPane) return prevPanes;

      const tabToMove = fromPane.tabs.find(t => t.id === tabId);
      if (!tabToMove) return prevPanes;

      return prevPanes.map(pane => {
        // Remove tab from source pane
        if (pane.id === fromPaneId) {
          const newTabs = pane.tabs.filter(t => t.id !== tabId);
          let newActiveTabId = pane.activeTabId;

          // Update active tab if we're closing the active one
          if (pane.activeTabId === tabId) {
            if (newTabs.length === 0) {
              newActiveTabId = null;
            } else {
              const tabIndex = pane.tabs.findIndex(t => t.id === tabId);
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

        // Add tab to destination pane
        if (pane.id === toPaneId) {
          // Check if tab with same appId already exists in destination
          const existingTab = pane.tabs.find(t => t.appId === tabToMove.appId);
          if (existingTab) {
            // Just activate the existing tab instead of creating duplicate
            return {
              ...pane,
              activeTabId: existingTab.id
            };
          }

          return {
            ...pane,
            tabs: [...pane.tabs, tabToMove],
            activeTabId: tabToMove.id
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
    moveTab,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}
