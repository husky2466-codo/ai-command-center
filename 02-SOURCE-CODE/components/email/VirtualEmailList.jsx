import React, { useRef, useEffect } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import EmailListItem from './EmailListItem';

/**
 * VirtualEmailList - Virtualized email list using react-window
 * Efficiently renders 1000+ emails by only rendering visible items
 */
export default function VirtualEmailList({
  emails,
  selectedEmailId,
  selectedIds,
  onSelectEmail,
  onToggleSelect,
  onToggleStar,
  selectMode,
  itemHeight = 72
}) {
  const listRef = useRef(null);

  // Scroll to selected email when it changes (for keyboard navigation)
  useEffect(() => {
    if (selectedEmailId && listRef.current) {
      const selectedIndex = emails.findIndex(e => e.id === selectedEmailId);
      if (selectedIndex !== -1) {
        listRef.current.scrollToItem(selectedIndex, 'smart');
      }
    }
  }, [selectedEmailId, emails]);

  // Item data to pass to row renderer
  const itemData = {
    emails,
    selectedEmailId,
    selectedIds,
    onSelectEmail,
    onToggleSelect,
    onToggleStar,
    selectMode
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          ref={listRef}
          height={height}
          width={width}
          itemCount={emails.length}
          itemSize={itemHeight}
          overscanCount={5}
          itemData={itemData}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
}

// Row renderer component - receives index, style, and data
function Row({ index, style, data }) {
  const { emails, selectedEmailId, selectedIds, onSelectEmail, onToggleSelect, onToggleStar, selectMode } = data;
  const email = emails[index];
  const isSelected = email.id === selectedEmailId;
  const isChecked = selectedIds.has(email.id);

  return (
    <EmailListItem
      email={email}
      isSelected={isSelected}
      isChecked={isChecked}
      onSelect={onSelectEmail}
      onToggleCheck={onToggleSelect}
      onToggleStar={onToggleStar}
      selectMode={selectMode}
      style={style}
    />
  );
}
