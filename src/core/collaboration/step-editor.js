/**
 * Step Editor Panel Component
 * Provides UI for editing step properties in the diagram
 */

/**
 * Step Editor Configuration
 */
const EDITOR_CONFIG = {
  width: 350,
  animationDuration: 150,
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
 * StepEditor class - provides floating editor for step properties
 */
export class StepEditor {
  /**
   * Create a new StepEditor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      onSave: options.onSave || null,
      onCancel: options.onCancel || null,
      ...options,
    };

    this.editorElement = null;
    this.currentStepIndex = null;
    this.currentMessage = null;
    this.ast = null;
    this.isVisible = false;
    
    this._createEditor();
  }

  /**
   * Create the floating editor element
   */
  _createEditor() {
    this.editorElement = document.createElement('div');
    this.editorElement.className = 'step-editor-panel';
    this.editorElement.style.cssText = `
      display: none;
      position: fixed;
      width: ${EDITOR_CONFIG.width}px;
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
   * Show the editor for a specific step
   * @param {number} stepIndex - The step index (0-based)
   * @param {Object} message - The message object from AST
   * @param {Object} ast - The full AST
   * @param {Object} position - The position {x, y} for the editor
   */
  show(stepIndex, message, ast, position = null) {
    this.currentStepIndex = stepIndex;
    this.currentMessage = { ...message };
    this.ast = ast;

    this._renderEditor();
    
    // Position the editor
    if (position) {
      this._positionEditor(position);
    } else {
      this._centerEditor();
    }

    this.editorElement.style.display = 'block';
    this.isVisible = true;

    // Focus the first input
    const firstInput = this.editorElement.querySelector('input, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  /**
   * Hide the editor
   */
  hide() {
    this.editorElement.style.display = 'none';
    this.isVisible = false;
    this.currentStepIndex = null;
    this.currentMessage = null;
  }

  /**
   * Render the editor UI
   */
  _renderEditor() {
    const message = this.currentMessage;
    const annotations = message.annotations || {};
    const stepNumber = this.currentStepIndex + 1;

    // Get available participants
    const participants = this.ast?.participants?.map(p => p.id) || [];
    // Get available flows
    const flows = this.ast?.flows || [];
    const selectedFlows = annotations.flows || [];

    this.editorElement.innerHTML = `
      <div class="step-editor-header" style="
        padding: 14px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <span style="
            background: #3b82f6;
            color: white;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          ">Step ${stepNumber}</span>
          <span style="
            font-size: 14px;
            font-weight: 600;
            color: #333;
          ">Edit Properties</span>
        </div>
        <button class="step-editor-close" style="
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          color: #666;
          padding: 0 4px;
          line-height: 1;
        " title="Close">×</button>
      </div>
      
      <div class="step-editor-body" style="
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
          ">Message</label>
          <input 
            type="text" 
            name="text" 
            value="${this._escapeHtml(message.text || '')}"
            style="
              width: 100%;
              padding: 8px 10px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 13px;
              box-sizing: border-box;
            "
            placeholder="Enter message text"
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
            ">From</label>
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
            >
              ${participants.map(p => 
                `<option value="${p}" ${p === message.source ? 'selected' : ''}>${p}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 4px;
            ">To</label>
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
            >
              ${participants.map(p => 
                `<option value="${p}" ${p === message.target ? 'selected' : ''}>${p}</option>`
              ).join('')}
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
              <input 
                type="radio" 
                name="arrowLine" 
                value="solid" 
                ${message.arrow?.line !== 'dashed' ? 'checked' : ''}
              /> Solid (→)
            </label>
            <label style="
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              cursor: pointer;
            ">
              <input 
                type="radio" 
                name="arrowLine" 
                value="dashed" 
                ${message.arrow?.line === 'dashed' ? 'checked' : ''}
              /> Dashed (-→)
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
            <input 
              type="checkbox" 
              name="isAsync" 
              ${annotations.isAsync ? 'checked' : ''}
            />
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
              ${HTTP_METHODS.map(m => 
                `<option value="${m}" ${m === annotations.method ? 'selected' : ''}>${m}</option>`
              ).join('')}
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
              value="${this._escapeHtml(annotations.path || '')}"
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
            ${REQUEST_TYPES.map(t => 
              `<option value="${t}" ${t === annotations.requestType ? 'selected' : ''}>${t}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Timeout and Queue -->
        <div style="display: flex; gap: 10px; margin-bottom: 14px;">
          <div class="form-group" style="flex: 1;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 4px;
            ">Timeout</label>
            <input 
              type="text" 
              name="timeout" 
              value="${this._escapeHtml(annotations.timeout || '')}"
              style="
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
              "
              placeholder="e.g., 30s"
            />
          </div>
          <div class="form-group" style="flex: 1;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #555;
              margin-bottom: 4px;
            ">Queue</label>
            <input 
              type="text" 
              name="queue" 
              value="${this._escapeHtml(annotations.queue || '')}"
              style="
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
              "
              placeholder="queue-name"
            />
          </div>
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
                  <input 
                    type="checkbox" 
                    name="flows" 
                    value="${f.id}" 
                    ${selectedFlows.includes(f.id) ? 'checked' : ''}
                  />
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
      
      <div class="step-editor-footer" style="
        padding: 12px 16px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      ">
        <button class="step-editor-cancel" style="
          padding: 8px 16px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        ">Cancel</button>
        <button class="step-editor-save" style="
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">Save Changes</button>
      </div>
    `;

    this._bindEventListeners();
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
    if (left + EDITOR_CONFIG.width > viewportWidth - 20) {
      left = position.x - EDITOR_CONFIG.width - 10;
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
   * Center the editor in the viewport
   */
  _centerEditor() {
    this.editorElement.style.left = '50%';
    this.editorElement.style.top = '50%';
    this.editorElement.style.transform = 'translate(-50%, -50%)';
  }

  /**
   * Bind event listeners
   */
  _bindEventListeners() {
    // Close button
    const closeBtn = this.editorElement.querySelector('.step-editor-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._cancel());
    }

    // Cancel button
    const cancelBtn = this.editorElement.querySelector('.step-editor-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this._cancel());
    }

    // Save button
    const saveBtn = this.editorElement.querySelector('.step-editor-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._save());
    }

    // Escape key to close
    document.addEventListener('keydown', this._handleKeyDown = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this._cancel();
      }
    });

    // Make header draggable
    this._makeDraggable();
  }

  /**
   * Make the editor draggable by its header
   */
  _makeDraggable() {
    const header = this.editorElement.querySelector('.step-editor-header');
    if (!header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = this.editorElement.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      this.editorElement.style.transform = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      this.editorElement.style.left = `${startLeft + deltaX}px`;
      this.editorElement.style.top = `${startTop + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Get form values
   * @returns {Object} The form values
   */
  _getFormValues() {
    const form = this.editorElement;
    
    const text = form.querySelector('[name="text"]')?.value || '';
    const source = form.querySelector('[name="source"]')?.value || '';
    const target = form.querySelector('[name="target"]')?.value || '';
    const arrowLine = form.querySelector('[name="arrowLine"]:checked')?.value || 'solid';
    const isAsync = form.querySelector('[name="isAsync"]')?.checked || false;
    const method = form.querySelector('[name="method"]')?.value || null;
    const path = form.querySelector('[name="path"]')?.value || null;
    const requestType = form.querySelector('[name="requestType"]')?.value || null;
    const timeout = form.querySelector('[name="timeout"]')?.value || null;
    const queue = form.querySelector('[name="queue"]')?.value || null;
    
    // Get selected flows
    const flowCheckboxes = form.querySelectorAll('[name="flows"]:checked');
    const flows = Array.from(flowCheckboxes).map(cb => cb.value);

    return {
      text,
      source,
      target,
      arrow: {
        line: arrowLine,
        head: this.currentMessage?.arrow?.head || 'filled',
      },
      annotations: {
        isAsync,
        method: method || null,
        path: path || null,
        requestType: requestType || null,
        timeout: timeout || null,
        queue: queue || null,
        flows,
        request: this.currentMessage?.annotations?.request || null,
        response: this.currentMessage?.annotations?.response || null,
      },
    };
  }

  /**
   * Save changes
   */
  _save() {
    const values = this._getFormValues();
    
    if (this.options.onSave) {
      this.options.onSave(this.currentStepIndex, values);
    }

    this.hide();
  }

  /**
   * Cancel editing
   */
  _cancel() {
    if (this.options.onCancel) {
      this.options.onCancel();
    }

    this.hide();
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
   * Destroy the editor
   */
  destroy() {
    if (this._handleKeyDown) {
      document.removeEventListener('keydown', this._handleKeyDown);
    }
    if (this.editorElement) {
      this.editorElement.remove();
    }
    this.editorElement = null;
    this.currentStepIndex = null;
    this.currentMessage = null;
    this.ast = null;
  }
}
