/**
 * Topology Layout Algorithm
 * Calculates node positions for DGX server topology visualization
 */

/**
 * Calculate positions for DGX server nodes in the topology view
 * @param {Array} connections - Array of DGX connections
 * @param {string} layoutMode - Layout mode: 'horizontal', 'vertical', 'grid'
 * @param {Object} containerDimensions - Container size { width, height }
 * @returns {Array} Array of { id, x, y, width, height } positions
 */
export function calculateNodePositions(connections, layoutMode = 'horizontal', containerDimensions = { width: 800, height: 600 }) {
  if (!connections || connections.length === 0) {
    return [];
  }

  const nodeCount = connections.length;
  const { width: containerWidth, height: containerHeight } = containerDimensions;

  // Node dimensions
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 180;
  const SPACING = 40; // Space between nodes
  const EDGE_MARGIN = 60; // Margin from container edges

  switch (layoutMode) {
    case 'horizontal':
      return calculateHorizontalLayout(
        connections,
        nodeCount,
        NODE_WIDTH,
        NODE_HEIGHT,
        SPACING,
        EDGE_MARGIN,
        containerWidth,
        containerHeight
      );

    case 'vertical':
      return calculateVerticalLayout(
        connections,
        nodeCount,
        NODE_WIDTH,
        NODE_HEIGHT,
        SPACING,
        EDGE_MARGIN,
        containerWidth,
        containerHeight
      );

    case 'grid':
      return calculateGridLayout(
        connections,
        nodeCount,
        NODE_WIDTH,
        NODE_HEIGHT,
        SPACING,
        EDGE_MARGIN,
        containerWidth,
        containerHeight
      );

    default:
      return calculateHorizontalLayout(
        connections,
        nodeCount,
        NODE_WIDTH,
        NODE_HEIGHT,
        SPACING,
        EDGE_MARGIN,
        containerWidth,
        containerHeight
      );
  }
}

/**
 * Horizontal layout: nodes side-by-side
 */
function calculateHorizontalLayout(
  connections,
  nodeCount,
  nodeWidth,
  nodeHeight,
  spacing,
  margin,
  containerWidth,
  containerHeight
) {
  const totalWidth = nodeCount * nodeWidth + (nodeCount - 1) * spacing;
  const startX = (containerWidth - totalWidth) / 2;
  const startY = (containerHeight - nodeHeight) / 2;

  return connections.map((connection, index) => ({
    id: connection.id,
    x: startX + index * (nodeWidth + spacing),
    y: startY,
    width: nodeWidth,
    height: nodeHeight
  }));
}

/**
 * Vertical layout: nodes top-to-bottom
 */
function calculateVerticalLayout(
  connections,
  nodeCount,
  nodeWidth,
  nodeHeight,
  spacing,
  margin,
  containerWidth,
  containerHeight
) {
  const totalHeight = nodeCount * nodeHeight + (nodeCount - 1) * spacing;
  const startX = (containerWidth - nodeWidth) / 2;
  const startY = (containerHeight - totalHeight) / 2;

  return connections.map((connection, index) => ({
    id: connection.id,
    x: startX,
    y: startY + index * (nodeHeight + spacing),
    width: nodeWidth,
    height: nodeHeight
  }));
}

/**
 * Grid layout: responsive grid (2 columns for 2+ nodes)
 */
function calculateGridLayout(
  connections,
  nodeCount,
  nodeWidth,
  nodeHeight,
  spacing,
  margin,
  containerWidth,
  containerHeight
) {
  // Calculate columns based on node count
  const columns = nodeCount === 1 ? 1 : Math.min(Math.ceil(Math.sqrt(nodeCount)), 3);
  const rows = Math.ceil(nodeCount / columns);

  const totalWidth = columns * nodeWidth + (columns - 1) * spacing;
  const totalHeight = rows * nodeHeight + (rows - 1) * spacing;
  const startX = (containerWidth - totalWidth) / 2;
  const startY = (containerHeight - totalHeight) / 2;

  return connections.map((connection, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      id: connection.id,
      x: startX + col * (nodeWidth + spacing),
      y: startY + row * (nodeHeight + spacing),
      width: nodeWidth,
      height: nodeHeight
    };
  });
}

/**
 * Get status color based on connection state
 * @param {Object} connection - DGX connection object
 * @returns {string} CSS variable name for status color
 */
export function getStatusColor(connection) {
  if (!connection) return '--text-tertiary';

  const status = connection.status?.toLowerCase() || 'offline';

  switch (status) {
    case 'online':
    case 'connected':
      return '--status-success';
    case 'connecting':
    case 'authenticating':
      return '--status-warning';
    case 'error':
    case 'failed':
      return '--status-error';
    case 'offline':
    case 'disconnected':
    default:
      return '--text-tertiary';
  }
}

/**
 * Get status label for display
 * @param {Object} connection - DGX connection object
 * @returns {string} Human-readable status label
 */
export function getStatusLabel(connection) {
  if (!connection) return 'Offline';

  const status = connection.status?.toLowerCase() || 'offline';

  switch (status) {
    case 'online':
    case 'connected':
      return 'Online';
    case 'connecting':
      return 'Connecting...';
    case 'authenticating':
      return 'Authenticating...';
    case 'error':
    case 'failed':
      return 'Error';
    case 'offline':
    case 'disconnected':
    default:
      return 'Offline';
  }
}

/**
 * Check if connection should show pulse animation
 * @param {Object} connection - DGX connection object
 * @returns {boolean} True if should pulse
 */
export function shouldPulse(connection) {
  if (!connection) return false;

  const status = connection.status?.toLowerCase() || 'offline';
  return status === 'connecting' || status === 'authenticating';
}
