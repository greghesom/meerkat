/**
 * MappingPanel - UI for managing participant-to-shape mappings
 */
export class MappingPanel {
  /**
   * @param {HTMLElement} container
   * @param {Object} callbacks
   */
  constructor(container, callbacks = {}) {
    this.container = container;
    this.onMappingChange = callbacks.onMappingChange || (() => {});
    this.onHighlightShape = callbacks.onHighlightShape || (() => {});
    this.onAutoMap = callbacks.onAutoMap || (() => {});
    this.onClearAll = callbacks.onClearAll || (() => {});
    
    this.participants = [];
    this.shapes = [];
    this.currentMappings = new Map();
  }

  /**
   * Render the mapping panel
   * @param {Array} participants - Participant objects
   * @param {Array} shapes - Shape objects
   * @param {Map} currentMappings - Current mappings (participantId -> shapeId)
   */
  render(participants, shapes, currentMappings) {
    this.participants = participants;
    this.shapes = shapes;
    this.currentMappings = currentMappings;
    
    this.container.innerHTML = `
      <div class="mapping-panel">
        <div class="mapping-panel-header">
          <h3>Participant Mappings</h3>
          <div class="mapping-panel-actions">
            <button class="mapping-btn auto-map-btn" title="Automatically map participants">
              Auto-Map
            </button>
            <button class="mapping-btn clear-all-btn" title="Clear all mappings">
              Clear All
            </button>
          </div>
        </div>
        <div class="mapping-list">
          ${this.renderMappingList()}
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }

  /**
   * Render the list of participant mappings
   * @returns {string} HTML string
   */
  renderMappingList() {
    if (this.participants.length === 0) {
      return '<div class="mapping-empty">No participants to map</div>';
    }
    
    return this.participants.map(participant => {
      const participantId = participant.id;
      const participantName = participant.displayName || participant.id;
      const mappedShapeId = this.currentMappings.get(participantId);
      const mappedShape = mappedShapeId ? this.shapes.find(s => s.id === mappedShapeId) : null;
      
      // Determine status
      let status = 'unmapped';
      let statusIcon = '✗';
      let statusClass = 'status-unmapped';
      
      if (mappedShape) {
        status = 'mapped';
        statusIcon = '✓';
        statusClass = 'status-mapped';
      }
      
      return `
        <div class="mapping-item" data-participant-id="${participantId}">
          <div class="mapping-item-header">
            <span class="mapping-status ${statusClass}" title="${status}">${statusIcon}</span>
            <span class="mapping-participant-name">${this.escapeHtml(participantName)}</span>
          </div>
          <div class="mapping-item-control">
            <select class="shape-select" data-participant-id="${participantId}">
              <option value="">Select shape...</option>
              ${this.renderShapeOptions(mappedShapeId)}
            </select>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render shape options for dropdown
   * @param {string} selectedShapeId - Currently selected shape ID
   * @returns {string} HTML string
   */
  renderShapeOptions(selectedShapeId) {
    return this.shapes.map(shape => {
      const selected = shape.id === selectedShapeId ? 'selected' : '';
      const label = shape.label || `Shape ${shape.id}`;
      return `<option value="${shape.id}" ${selected}>${this.escapeHtml(label)}</option>`;
    }).join('');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Auto-map button
    const autoMapBtn = this.container.querySelector('.auto-map-btn');
    if (autoMapBtn) {
      autoMapBtn.addEventListener('click', () => this.onAutoMap());
    }
    
    // Clear all button
    const clearAllBtn = this.container.querySelector('.clear-all-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.onClearAll());
    }
    
    // Shape select dropdowns
    const selects = this.container.querySelectorAll('.shape-select');
    selects.forEach(select => {
      select.addEventListener('change', (e) => {
        const participantId = e.target.dataset.participantId;
        const shapeId = e.target.value;
        this.onMappingChange(participantId, shapeId || null);
      });
      
      // Highlight shape on hover
      select.addEventListener('mouseover', (e) => {
        if (e.target.value) {
          this.onHighlightShape(e.target.value);
        }
      });
      
      select.addEventListener('mouseout', () => {
        this.onHighlightShape(null);
      });
    });
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update the panel with new mappings
   * @param {Map} currentMappings
   */
  updateMappings(currentMappings) {
    this.currentMappings = currentMappings;
    this.render(this.participants, this.shapes, currentMappings);
  }
}
