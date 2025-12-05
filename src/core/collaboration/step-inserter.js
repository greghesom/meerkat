/**
 * Step Inserter Component
 * Handles insertion of new steps into the diagram by clicking on sequence lines
 */

/**
 * Inserter Configuration
 */
const INSERTER_CONFIG = {
  lineHighlightColor: '#3b82f6',
  lineHighlightWidth: 4,
  cursorStyle: 'crosshair',
};

/**
 * HTTP methods for dropdown
 */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

/**
 * Request types for dropdown
 */
const REQUEST_TYPES = ['JSON', 'SOAP', 'XML', 'RFC_SAP', 'GraphQL', 'gRPC', 'BINARY'];

/**
 * StepInserter class - handles step insertion workflow
 */
export class StepInserter {
  /**
   * Create a new StepInserter
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      diagramContainer: options.diagramContainer || null,
      onInsert: options.onInsert || null,
      ...options,
    };

    this.isActive = false;
    this.insertAfterIndex = null;
    this.ast = null;
    this.editorElement = null;
    this.highlightLine = null;
    
    this._createEditor();
  }

  /**
   * Create the step editor UI
   */
  _createEditor() {
    this.editorElement = document.createElement('div');
    this.editorElement.className = 'step-inserter-panel';
    this.editorElement.style.cssText = `
      display: none;
      position: fixed;
      width: 380px;
      max-height: 80vh;
      background: #ffffff;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(this.editorElement);
  }

  /**
   * Start the insertion mode
   * @param {Object} ast - The current diagram AST
   */
  startInsertMode(ast) {
    this.ast = ast;
    this.isActive = true;
    
    // Add visual feedback
    this._showInsertModeIndicator();
    
    // Add click handlers to detect line clicks
    this._addLineClickHandlers();
  }

  /**
   * Cancel insertion mode
   */
  cancelInsertMode() {
    this.isActive = false;
    this.insertAfterIndex = null;
    
    this._hideInsertModeIndicator();
    this._removeLineClickHandlers();
    this._hideEditor();
  }

  /**
   * Show insert mode visual indicator
   */
  _showInsertModeIndicator() {
    const container = this.options.diagramContainer;
    if (container) {
      container.style.cursor = INSERTER_CONFIG.cursorStyle;
    }

    // Create overlay indicator
    this.modeIndicator = document.createElement('div');
    this.modeIndicator.className = 'insert-mode-indicator';
    this.modeIndicator.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #3b82f6;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      ">
        <span>📍</span>
        <span>Click between steps to insert a new step</span>
        <button style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 10px;
        " class="cancel-insert-mode">Cancel</button>
      </div>
    `;
    document.body.appendChild(this.modeIndicator);

    this.modeIndicator.querySelector('.cancel-insert-mode').addEventListener('click', () => {
      this.cancelInsertMode();
    });
  }

  /**
   * Hide insert mode indicator
   */
  _hideInsertModeIndicator() {
    const container = this.options.diagramContainer;
    if (container) {
      container.style.cursor = '';
    }

    if (this.modeIndicator) {
      this.modeIndicator.remove();
      this.modeIndicator = null;
    }
  }

  /**
   * Add click handlers to detect clicks between messages
   */
  _addLineClickHandlers() {
    const svg = this.options.diagramContainer?.querySelector('svg');
    if (!svg) return;

    this._svgClickHandler = (e) => {
      if (!this.isActive) return;

      // Get click position relative to SVG
      const rect = svg.getBoundingClientRect();
      const clickY = e.clientY - rect.top;

      // Find the best insertion point based on click Y position
      const insertIndex = this._findInsertionIndex(clickY);
      
      if (insertIndex !== null) {
        this._showInsertEditor(insertIndex, { x: e.clientX, y: e.clientY });
      }
    };

    svg.addEventListener('click', this._svgClickHandler);
  }

  /**
   * Remove line click handlers
   */
  _removeLineClickHandlers() {
    const svg = this.options.diagramContainer?.querySelector('svg');
    if (svg && this._svgClickHandler) {
      svg.removeEventListener('click', this._svgClickHandler);
      this._svgClickHandler = null;
    }
  }

  /**
   * Find the insertion index based on click Y position
   * @param {number} clickY - The Y position of the click
   * @returns {number|null} The index to insert after, or null
   */
  _findInsertionIndex(clickY) {
    if (!this.ast || !this.ast.messages.length) return 0;

    // Get message groups from SVG
    const svg = this.options.diagramContainer?.querySelector('svg');
    if (!svg) return 0;

    const messageGroups = svg.querySelectorAll('[class*="message-"]');
    
    // Calculate the Y positions of each message
    const positions = Array.from(messageGroups).map((group, index) => {
      const line = group.querySelector('line');
      if (line) {
        const y1 = parseFloat(line.getAttribute('y1'));
        return { index, y: y1 };
      }
      return { index, y: 0 };
    }).filter(p => p.y > 0);

    // If no positions found or click is above all messages
    if (positions.length === 0 || clickY < positions[0].y - 25) {
      return 0;
    }

    // Find the insertion point
    for (let i = 0; i < positions.length - 1; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      const midPoint = (current.y + next.y) / 2;
      
      if (clickY >= current.y - 25 && clickY < midPoint) {
        return current.index + 1;
      } else if (clickY >= midPoint && clickY < next.y - 25) {
        return next.index;
      }
    }

    // Click is after last message
    return this.ast.messages.length;
  }

  /**
   * Show the insert editor at a specific position
   * @param {number} insertIndex - The index to insert at
   * @param {Object} position - The position {x, y}
   */
  _showInsertEditor(insertIndex, position) {
    this.insertAfterIndex = insertIndex;
    this._hideInsertModeIndicator();
    
    const participants = this.ast?.participants?.map(p => p.id) || [];
    const flows = this.ast?.flows || [];
    
    this.editorElement.innerHTML = `
      <div class="step-inserter-header" style="
        padding: 14px 16px;
        background: #f0fdf4;
        border-bottom: 1px solid #bbf7d0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <span style="
            background: #22c55e;
            color: white;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          ">New Step</span>
          <span style="
            font-size: 14px;
            font-weight: 600;
            color: #15803d;
          ">Insert at position ${insertIndex + 1}</span>
        </div>
        <button class="step-inserter-close" style="
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          color: #666;
          padding: 0 4px;
          line-height: 1;
        " title="Close">×</button>
      </div>
      
      <div class="step-inserter-body" style="
        padding: 16px;
        max-height: 60vh;
        overflow-y: auto;
      ">
        <!-- Message Text -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #555;
            margin-bottom: 4px;
          ">Message *</label>
          <input 
            type="text" 
            name="text" 
            style="
              width: 100%;
              padding: 8px 10px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 13px;
              box-sizing: border-box;
            "
            placeholder="Enter message text"
            required
          />
        </div>

        <!-- Source and Target -->
        <div style="display: flex; gap: 10px; margin-bottom: 14px;">
          <div class="form-group" style="flex: 1;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 4px;
            ">From *</label>
            <select 
              name="source"
              style="
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
                background: white;
              "
              required
            >
              <option value="">Select...</option>
              ${participants.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 4px;
            ">To *</label>
            <select 
              name="target"
              style="
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
                background: white;
              "
              required
            >
              <option value="">Select...</option>
              ${participants.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Arrow Type -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #555;
            margin-bottom: 4px;
          ">Arrow Style</label>
          <div style="display: flex; gap: 10px;">
            <label style="
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              cursor: pointer;
            ">
              <input type="radio" name="arrowLine" value="solid" checked /> Solid (→)
            </label>
            <label style="
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              cursor: pointer;
            ">
              <input type="radio" name="arrowLine" value="dashed" /> Dashed (-→)
            </label>
          </div>
        </div>

        <!-- Async Toggle -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            cursor: pointer;
          ">
            <input type="checkbox" name="isAsync" />
            <span style="font-weight: 500;">Asynchronous</span>
          </label>
        </div>

        <!-- HTTP Method and Path -->
        <div style="display: flex; gap: 10px; margin-bottom: 14px;">
          <div class="form-group" style="width: 100px;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 4px;
            ">Method</label>
            <select 
              name="method"
              style="
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
                background: white;
              "
            >
              <option value="">None</option>
              ${HTTP_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 4px;
            ">API Path</label>
            <input 
              type="text" 
              name="path" 
              style="
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
                font-family: monospace;
              "
              placeholder="/api/endpoint"
            />
          </div>
        </div>

        <!-- Request Type -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #555;
            margin-bottom: 4px;
          ">Request Type</label>
          <select 
            name="requestType"
            style="
              width: 100%;
              padding: 8px 10px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 13px;
              box-sizing: border-box;
              background: white;
            "
          >
            <option value="">None</option>
            ${REQUEST_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>

        <!-- Flows -->
        ${flows.length > 0 ? `
          <div class="form-group" style="margin-bottom: 14px;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 6px;
            ">Flows</label>
            <div style="
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            ">
              ${flows.map(f => `
                <label style="
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  font-size: 12px;
                  cursor: pointer;
                  padding: 4px 8px;
                  background: #f0f0f0;
                  border-radius: 4px;
                ">
                  <input type="checkbox" name="flows" value="${f.id}" />
                  <span style="
                    width: 10px;
                    height: 10px;
                    background: ${f.color || '#888'};
                    border-radius: 2px;
                  "></span>
                  ${this._escapeHtml(f.displayName || f.id)}
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      
      <div class="step-inserter-footer" style="
        padding: 12px 16px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      ">
        <button class="step-inserter-cancel" style="
          padding: 8px 16px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        ">Cancel</button>
        <button class="step-inserter-save" style="
          padding: 8px 16px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">Insert Step</button>
      </div>
    `;

    this._positionEditor(position);
    this.editorElement.style.display = 'block';
    this._bindEditorEvents();

    // Focus the message input
    const msgInput = this.editorElement.querySelector('[name="text"]');
    if (msgInput) {
      setTimeout(() => msgInput.focus(), 100);
    }
  }

  /**
   * Hide the editor
   */
  _hideEditor() {
    if (this.editorElement) {
      this.editorElement.style.display = 'none';
    }
  }

  /**
   * Position the editor near a specific point
   * @param {Object} position - The position {x, y}
   */
  _positionEditor(position) {
    const rect = this.editorElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = position.x + 10;
    let top = position.y;

    // Adjust if would go off right edge
    if (left + 380 > viewportWidth - 20) {
      left = position.x - 380 - 10;
    }

    // Adjust if would go off bottom edge
    if (top + rect.height > viewportHeight - 20) {
      top = viewportHeight - rect.height - 20;
    }

    // Ensure not off left or top edge
    left = Math.max(20, left);
    top = Math.max(20, top);

    this.editorElement.style.left = `${left}px`;
    this.editorElement.style.top = `${top}px`;
  }

  /**
   * Bind editor event listeners
   */
  _bindEditorEvents() {
    // Close button
    const closeBtn = this.editorElement.querySelector('.step-inserter-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.cancelInsertMode());
    }

    // Cancel button
    const cancelBtn = this.editorElement.querySelector('.step-inserter-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelInsertMode());
    }

    // Save button
    const saveBtn = this.editorElement.querySelector('.step-inserter-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._insertStep());
    }
  }

  /**
   * Get form values
   * @returns {Object} The form values
   */
  _getFormValues() {
    const form = this.editorElement;
    
    const text = form.querySelector('[name="text"]')?.value?.trim() || '';
    const source = form.querySelector('[name="source"]')?.value || '';
    const target = form.querySelector('[name="target"]')?.value || '';
    const arrowLine = form.querySelector('[name="arrowLine"]:checked')?.value || 'solid';
    const isAsync = form.querySelector('[name="isAsync"]')?.checked || false;
    const method = form.querySelector('[name="method"]')?.value || null;
    const path = form.querySelector('[name="path"]')?.value || null;
    const requestType = form.querySelector('[name="requestType"]')?.value || null;
    
    // Get selected flows
    const flowCheckboxes = form.querySelectorAll('[name="flows"]:checked');
    const flows = Array.from(flowCheckboxes).map(cb => cb.value);

    return {
      text,
      source,
      target,
      arrow: {
        line: arrowLine,
        head: 'filled',
      },
      annotations: {
        isAsync,
        method: method || null,
        path: path || null,
        requestType: requestType || null,
        timeout: null,
        queue: null,
        flows,
        request: null,
        response: null,
      },
    };
  }

  /**
   * Insert the new step
   */
  _insertStep() {
    const values = this._getFormValues();

    // Validate required fields
    if (!values.text) {
      alert('Please enter a message text');
      return;
    }
    if (!values.source) {
      alert('Please select a source participant');
      return;
    }
    if (!values.target) {
      alert('Please select a target participant');
      return;
    }

    if (this.options.onInsert) {
      this.options.onInsert(this.insertAfterIndex, values);
    }

    this.cancelInsertMode();
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string}
   */
  _escapeHtml(text) {
    if (text == null) return '';
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Destroy the inserter
   */
  destroy() {
    this.cancelInsertMode();
    if (this.editorElement) {
      this.editorElement.remove();
    }
    this.editorElement = null;
    this.ast = null;
  }
}
