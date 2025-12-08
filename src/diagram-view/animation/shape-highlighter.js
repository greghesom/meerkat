/**
 * ShapeHighlighter - Highlights shapes on draw.io diagram
 */
export class ShapeHighlighter {
  /**
   * @param {Object} graph - The mxGraph instance
   * @param {Object} options
   */
  constructor(graph, options = {}) {
    this.graph = graph;
    this.colors = {
      source: options.sourceColor || '#4CAF50',
      target: options.targetColor || '#2196F3',
      active: options.activeColor || '#FF9800',
      ...options.colors
    };
    this.activeHighlights = new Map(); // cellId -> { cell, originalStyle }
  }

  /**
   * Highlight a shape
   * @param {string} cellId
   * @param {'source'|'target'|'active'} type
   */
  highlight(cellId, type = 'active') {
    const model = this.graph.getModel();
    const cell = model.getCell(cellId);
    
    if (!cell) {
      console.warn(`Cell not found: ${cellId}`);
      return;
    }

    // Save original style if not already saved
    if (!this.activeHighlights.has(cellId)) {
      this.activeHighlights.set(cellId, {
        cell,
        originalStyle: cell.style
      });
    }

    // Get color for highlight type
    const color = this.colors[type] || this.colors.active;

    // Apply highlight style
    model.beginUpdate();
    try {
      const currentStyle = cell.style || '';
      
      // Add stroke color and width
      const newStyle = this.updateStyle(currentStyle, {
        strokeColor: color,
        strokeWidth: '3',
        fillColor: this.lightenColor(color, 0.9)
      });
      
      model.setStyle(cell, newStyle);
    } finally {
      model.endUpdate();
    }

    // Refresh the view
    this.graph.refresh(cell);
  }

  /**
   * Clear highlight from shape
   * @param {string} cellId
   */
  clearHighlight(cellId) {
    const highlightData = this.activeHighlights.get(cellId);
    if (!highlightData) return;

    const model = this.graph.getModel();
    const { cell, originalStyle } = highlightData;

    // Restore original style
    model.beginUpdate();
    try {
      model.setStyle(cell, originalStyle);
    } finally {
      model.endUpdate();
    }

    // Refresh the view
    this.graph.refresh(cell);

    // Remove from active highlights
    this.activeHighlights.delete(cellId);
  }

  /**
   * Clear all highlights
   */
  clearAll() {
    for (const cellId of this.activeHighlights.keys()) {
      this.clearHighlight(cellId);
    }
  }

  /**
   * Update style string with new properties
   * @param {string} style - Current style string
   * @param {Object} updates - Properties to update
   * @returns {string} Updated style string
   */
  updateStyle(style, updates) {
    const parts = style ? style.split(';').filter(p => p) : [];
    const styleMap = new Map();
    
    // Parse existing style
    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key && value !== undefined) {
        styleMap.set(key, value);
      }
    });
    
    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      styleMap.set(key, value);
    });
    
    // Rebuild style string
    return Array.from(styleMap.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join(';');
  }

  /**
   * Lighten a color by a factor
   * @param {string} color - Hex color
   * @param {number} factor - 0-1, where 1 is white
   * @returns {string} Lightened hex color
   */
  lightenColor(color, factor) {
    // Remove # if present
    const hex = color.replace('#', '');
    
    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Lighten
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);
    
    // Convert back to hex
    return '#' + [newR, newG, newB]
      .map(c => c.toString(16).padStart(2, '0'))
      .join('');
  }
}
