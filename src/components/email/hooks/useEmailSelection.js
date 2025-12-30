/**
 * Hook for multi-select logic
 */
export function useEmailSelection(selectedEmailIds, setSelectedEmailIds, setSelectMode, paginatedEmails) {
  const handleToggleSelectMode = () => {
    if (setSelectMode) {
      setSelectMode(prev => {
        const newMode = !prev;
        // Exiting select mode - clear selections
        if (!newMode) {
          setSelectedEmailIds(new Set());
        }
        return newMode;
      });
    }
  };

  const handleToggleEmailSelection = (emailId, event) => {
    event?.stopPropagation();
    setSelectedEmailIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmailIds.size === paginatedEmails.length) {
      // All selected, deselect all
      setSelectedEmailIds(new Set());
    } else {
      // Select all visible emails
      setSelectedEmailIds(new Set(paginatedEmails.map(e => e.id)));
    }
  };

  const handleCancelSelection = () => {
    setSelectedEmailIds(new Set());
    if (setSelectMode) {
      setSelectMode(false);
    }
  };

  return {
    handleToggleSelectMode,
    handleToggleEmailSelection,
    handleSelectAll,
    handleCancelSelection
  };
}
