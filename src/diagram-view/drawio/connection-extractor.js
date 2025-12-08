/**
 * ConnectionExtractor - Extracts edge/connection data from mxGraph
 */
export class ConnectionExtractor {
  /**
   * @param {Object} graph - The mxGraph instance
   */
  constructor(graph) {
    this.graph = graph;
    this.connections = null;
  }

  /**
   * Extract all connections from the diagram
   * @returns {Array<ConnectionInfo>}
   */
  extract() {
    const connections = [];
    const model = this.graph.getModel();
    
    // Get root cell
    const root = model.getRoot();
    if (!root) return connections;

    // Iterate through all cells
    const processCell = (cell) => {
      // Skip root cells
      if (cell.id === '0' || cell.id === '1') {
        return;
      }

      // Only process edges
      if (model.isEdge(cell)) {
        const connectionInfo = this.getConnectionInfo(cell);
        if (connectionInfo) {
          connections.push(connectionInfo);
        }
      }

      // Process children recursively
      const childCount = model.getChildCount(cell);
      for (let i = 0; i < childCount; i++) {
        processCell(model.getChildAt(cell, i));
      }
    };

    processCell(root);
    
    this.connections = connections;
    return connections;
  }

  /**
   * Get connection info for a single edge
   * @param {Object} cell - The edge cell
   * @returns {ConnectionInfo|null}
   */
  getConnectionInfo(cell) {
    const model = this.graph.getModel();
    const view = this.graph.view;
    
    try {
      // Get source and target IDs
      const sourceId = cell.source?.id || null;
      const targetId = cell.target?.id || null;
      
      // Get label
      const label = this.graph.convertValueToString(cell);
      
      // Get state for path points
      const state = view.getState(cell);
      const absolutePoints = state?.absolutePoints || [];
      
      // Convert mxPoint objects to plain objects
      const points = absolutePoints.map(p => ({
        x: p.x,
        y: p.y
      }));
      
      // Calculate total path length
      const length = this.calculatePathLength(points);
      
      // Get style
      const style = cell.style || '';
      
      return {
        id: cell.id,
        sourceId,
        targetId,
        label,
        absolutePoints: points,
        length,
        style,
        cell
      };
    } catch (error) {
      console.error('Error extracting connection info:', error);
      return null;
    }
  }

  /**
   * Find edge connecting two shapes
   * @param {string} sourceId
   * @param {string} targetId
   * @returns {ConnectionInfo|null}
   */
  findEdgeBetween(sourceId, targetId) {
    if (!this.connections) {
      this.extract();
    }
    
    return this.connections.find(conn => 
      (conn.sourceId === sourceId && conn.targetId === targetId) ||
      (conn.sourceId === targetId && conn.targetId === sourceId)
    ) || null;
  }

  /**
   * Get all edges connected to a shape
   * @param {string} shapeId
   * @returns {Array<ConnectionInfo>}
   */
  getEdgesForShape(shapeId) {
    if (!this.connections) {
      this.extract();
    }
    
    return this.connections.filter(conn => 
      conn.sourceId === shapeId || conn.targetId === shapeId
    );
  }

  /**
   * Calculate path length from array of points
   * @param {Array<{x: number, y: number}>} points
   * @returns {number}
   */
  calculatePathLength(points) {
    if (!points || points.length < 2) {
      return 0;
    }
    
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    
    return totalLength;
  }
}

/**
 * @typedef {Object} ConnectionInfo
 * @property {string} id - Edge cell ID
 * @property {string|null} sourceId - Source shape ID
 * @property {string|null} targetId - Target shape ID
 * @property {string} label - Edge label
 * @property {Array<{x: number, y: number}>} absolutePoints - Path waypoints
 * @property {number} length - Total path length
 * @property {string} style - Edge style string
 * @property {Object} cell - Reference to the original mxCell
 */
