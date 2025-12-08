/**
 * ShapeExtractor - Extracts shape metadata from mxGraph
 */
export class ShapeExtractor {
  /**
   * @param {Object} graph - The mxGraph instance
   */
  constructor(graph) {
    this.graph = graph;
    this.shapes = null;
  }

  /**
   * Extract all shapes from the diagram
   * @returns {Array<ShapeInfo>} Array of shape information objects
   */
  extract() {
    const shapes = [];
    const model = this.graph.getModel();
    
    // Get root cell
    const root = model.getRoot();
    if (!root) return shapes;

    // Iterate through all cells
    const processCell = (cell) => {
      // Skip root cells (id 0 and 1)
      if (cell.id === '0' || cell.id === '1') {
        return;
      }

      // Only process vertices (shapes), not edges
      if (model.isVertex(cell)) {
        const shapeInfo = this.getShapeInfo(cell);
        if (shapeInfo) {
          shapes.push(shapeInfo);
        }
      }

      // Process children recursively
      const childCount = model.getChildCount(cell);
      for (let i = 0; i < childCount; i++) {
        processCell(model.getChildAt(cell, i));
      }
    };

    processCell(root);
    
    this.shapes = shapes;
    return shapes;
  }

  /**
   * Get shape info for a single cell
   * @param {Object} cell - The mxCell
   * @returns {ShapeInfo|null}
   */
  getShapeInfo(cell) {
    const model = this.graph.getModel();
    const view = this.graph.view;
    
    try {
      // Get label
      const rawLabel = this.graph.convertValueToString(cell);
      const label = this.stripHtml(rawLabel);
      
      // Get geometry from model
      const geometry = model.getGeometry(cell);
      const geo = geometry ? {
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height
      } : null;
      
      // Get state from view for rendered bounds
      const state = view.getState(cell);
      const bounds = state ? {
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
        centerX: state.getCenterX(),
        centerY: state.getCenterY()
      } : null;
      
      // Get style
      const style = cell.style || '';
      
      // Extract custom attributes if cell value is an Element
      const customAttributes = {};
      if (cell.value && typeof cell.value === 'object' && cell.value.attributes) {
        const attrs = cell.value.attributes;
        for (let i = 0; i < attrs.length; i++) {
          const attr = attrs[i];
          if (attr.name !== 'label' && attr.name !== 'as') {
            customAttributes[attr.name] = attr.value;
          }
        }
      }
      
      return {
        id: cell.id,
        label,
        rawLabel,
        bounds,
        geometry: geo,
        style,
        customAttributes,
        cell
      };
    } catch (error) {
      console.error('Error extracting shape info:', error);
      return null;
    }
  }

  /**
   * Strip HTML tags from string
   * @param {string} html
   * @returns {string} Plain text
   */
  stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Find shape by ID
   * @param {string} id
   * @returns {ShapeInfo|null}
   */
  findById(id) {
    if (!this.shapes) {
      this.extract();
    }
    return this.shapes.find(s => s.id === id) || null;
  }

  /**
   * Find shapes by label (case-insensitive)
   * @param {string} label
   * @returns {Array<ShapeInfo>}
   */
  findByLabel(label) {
    if (!this.shapes) {
      this.extract();
    }
    const searchLabel = label.toLowerCase();
    return this.shapes.filter(s => 
      s.label.toLowerCase().includes(searchLabel)
    );
  }
}

/**
 * @typedef {Object} ShapeInfo
 * @property {string} id - Cell ID
 * @property {string} label - Plain text label
 * @property {string} rawLabel - Original label (may contain HTML)
 * @property {Object} bounds - Rendered bounds {x, y, width, height, centerX, centerY}
 * @property {Object} geometry - Model geometry {x, y, width, height}
 * @property {string} style - Cell style string
 * @property {Object} customAttributes - Custom attributes from <object> wrapper
 * @property {Object} cell - Reference to the original mxCell
 */
