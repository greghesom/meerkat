/**
 * Step Details Panel for timeline scrubbing
 * Displays detailed information about the current step in the sequence diagram
 */

/**
 * Step Details Panel Configuration
 */
const PANEL_CONFIG = {
  padding: 15,
  labelFontSize: 11,
  valueFontSize: 13,
  sectionSpacing: 12,
  rowSpacing: 8,
};

/**
 * StepDetailsPanel class - displays detailed information about the current step
 */
export class StepDetailsPanel {
  /**
   * Create a new StepDetailsPanel
   * @param {HTMLElement|string} container - Container element or selector for the panel
   * @param {object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      padding: options.padding || PANEL_CONFIG.padding,
      position: options.position || 'right', // 'right', 'bottom', or 'none'
      ...options,
    };

    this.panelElement = null;
    this.currentMessage = null;
    this.ast = null;
  }

  /**
   * Initialize the step details panel with the AST
   * @param {object} ast - The parsed AST of the diagram
   */
  init(ast) {
    this.ast = ast;
    this.render();
  }

  /**
   * Render the step details panel UI
   */
  render() {
    if (!this.container) return;

    // Clear existing content
    this.container.innerHTML = '';

    // Create panel element
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'step-details-panel';
    this.panelElement.style.cssText = `
      padding: ${this.options.padding}px;
      background: #ffffff;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${PANEL_CONFIG.valueFontSize}px;
      color: #333;
      min-height: 100px;
    `;

    // Show placeholder when no step is selected
    this.showPlaceholder();

    this.container.appendChild(this.panelElement);
  }

  /**
   * Show placeholder when no step is selected
   */
  showPlaceholder() {
    if (!this.panelElement) return;

    this.panelElement.innerHTML = `
      <div style="
        color: #6c757d;
        text-align: center;
        padding: 20px;
        font-size: 14px;
      ">
        <div style="margin-bottom: 8px; font-size: 24px;">📋</div>
        <div>Select a step on the timeline to view details</div>
      </div>
    `;
  }

  /**
   * Update the panel to show details for a specific step
   * @param {number} stepIndex - The 0-based index of the message to display
   */
  updateStep(stepIndex) {
    if (!this.ast || !this.panelElement) return;

    // stepIndex is 0-based, but timeline uses 1-based steps
    // Step 0 means no message selected (start state)
    if (stepIndex === null || stepIndex === undefined || stepIndex < 1) {
      this.showPlaceholder();
      this.currentMessage = null;
      return;
    }

    const messageIndex = stepIndex - 1; // Convert 1-based step to 0-based index
    const message = this.ast.messages[messageIndex];

    if (!message) {
      this.showPlaceholder();
      this.currentMessage = null;
      return;
    }

    this.currentMessage = message;
    this.renderStepDetails(message, messageIndex);
  }

  /**
   * Render the details for a specific message/step
   * @param {object} message - The message object from the AST
   * @param {number} index - The 0-based index of the message
   */
  renderStepDetails(message, index) {
    if (!this.panelElement) return;

    const annotations = message.annotations || {};
    const sections = [];

    // Section 1: Step header with step number
    sections.push(this.createHeaderSection(message, index));

    // Section 2: Source and Target systems
    sections.push(this.createSystemSection(message));

    // Section 3: API Path and Method
    if (annotations.path || annotations.method) {
      sections.push(this.createApiSection(annotations));
    }

    // Section 4: Protocol Type
    if (annotations.requestType) {
      sections.push(this.createProtocolSection(annotations));
    }

    // Section 5: Sync/Async and Timeout
    if (annotations.isAsync !== undefined || annotations.timeout || annotations.queue) {
      sections.push(this.createSyncAsyncSection(annotations));
    }

    // Section 6: Request/Response Payloads
    if (annotations.request || annotations.response) {
      sections.push(this.createPayloadSection(annotations));
    }

    // Section 7: Flows
    if (annotations.flows && annotations.flows.length > 0) {
      sections.push(this.createFlowsSection(annotations.flows));
    }

    this.panelElement.innerHTML = sections.join('');
  }

  /**
   * Create header section with step number and message
   * @param {object} message - The message object
   * @param {number} index - The 0-based index
   * @returns {string} HTML string
   */
  createHeaderSection(message, index) {
    return `
      <div class="step-details-header" style="
        margin-bottom: ${PANEL_CONFIG.sectionSpacing}px;
        padding-bottom: ${PANEL_CONFIG.sectionSpacing}px;
        border-bottom: 1px solid #e9ecef;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        ">
          <span style="
            background: #3b82f6;
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          ">Step ${index + 1}</span>
        </div>
        <div style="
          font-size: 16px;
          font-weight: 500;
          color: #1a1a1a;
        ">${this.escapeHtml(message.text || 'Untitled Step')}</div>
      </div>
    `;
  }

  /**
   * Create source/target system section
   * @param {object} message - The message object
   * @returns {string} HTML string
   */
  createSystemSection(message) {
    const arrowIcon = message.arrow?.line === 'dashed' ? '⇢' : '→';
    
    return `
      <div class="step-details-section" style="margin-bottom: ${PANEL_CONFIG.sectionSpacing}px;">
        ${this.createSectionTitle('Systems')}
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
        ">
          <span style="
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 500;
            color: #0369a1;
          ">${this.escapeHtml(message.source)}</span>
          <span style="
            font-size: 18px;
            color: #6b7280;
          ">${arrowIcon}</span>
          <span style="
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 500;
            color: #15803d;
          ">${this.escapeHtml(message.target)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Create API path and method section
   * @param {object} annotations - The message annotations
   * @returns {string} HTML string
   */
  createApiSection(annotations) {
    const methodColors = {
      GET: '#61affe',
      POST: '#49cc90',
      PUT: '#fca130',
      DELETE: '#f93e3e',
      PATCH: '#50e3c2',
      HEAD: '#9012fe',
      OPTIONS: '#0d5aa7',
    };

    const method = annotations.method?.toUpperCase();
    const methodColor = methodColors[method] || '#666666';

    return `
      <div class="step-details-section" style="margin-bottom: ${PANEL_CONFIG.sectionSpacing}px;">
        ${this.createSectionTitle('API Endpoint')}
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          flex-wrap: wrap;
        ">
          ${method ? `
            <span style="
              background: ${methodColor};
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 12px;
              font-weight: 600;
            ">${method}</span>
          ` : ''}
          ${annotations.path ? `
            <code style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              padding: 4px 10px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 13px;
              color: #333;
            ">${this.escapeHtml(annotations.path)}</code>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Create protocol type section
   * @param {object} annotations - The message annotations
   * @returns {string} HTML string
   */
  createProtocolSection(annotations) {
    const protocolColors = {
      JSON: '#4caf50',
      SOAP: '#ff9800',
      XML: '#9c27b0',
      RFC_SAP: '#1976d2',
      GRAPHQL: '#e535ab',
      GRPC: '#244c5a',
      BINARY: '#607d8b',
    };

    const type = annotations.requestType?.toUpperCase();
    const color = protocolColors[type] || '#757575';

    return `
      <div class="step-details-section" style="margin-bottom: ${PANEL_CONFIG.sectionSpacing}px;">
        ${this.createSectionTitle('Protocol')}
        <div style="margin-top: 6px;">
          <span style="
            background: ${color};
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            font-weight: 600;
          ">${this.escapeHtml(annotations.requestType)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Create sync/async section with timeout and queue info
   * @param {object} annotations - The message annotations
   * @returns {string} HTML string
   */
  createSyncAsyncSection(annotations) {
    const isAsync = annotations.isAsync;
    const statusIcon = isAsync ? '⏱' : '↔';
    const statusText = isAsync ? 'Asynchronous' : 'Synchronous';
    const statusColor = isAsync ? '#f59e0b' : '#3b82f6';

    const items = [];

    items.push(`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="font-size: 18px;">${statusIcon}</span>
        <span style="
          color: ${statusColor};
          font-weight: 500;
        ">${statusText}</span>
      </div>
    `);

    if (annotations.timeout) {
      items.push(`
        <div style="margin-top: ${PANEL_CONFIG.rowSpacing}px;">
          ${this.createDetailRow('Timeout', annotations.timeout)}
        </div>
      `);
    }

    if (annotations.queue) {
      items.push(`
        <div style="margin-top: ${PANEL_CONFIG.rowSpacing}px;">
          ${this.createDetailRow('Queue', annotations.queue)}
        </div>
      `);
    }

    return `
      <div class="step-details-section" style="margin-bottom: ${PANEL_CONFIG.sectionSpacing}px;">
        ${this.createSectionTitle('Communication')}
        <div style="margin-top: 6px;">
          ${items.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Create payload section for request/response hints
   * @param {object} annotations - The message annotations
   * @returns {string} HTML string
   */
  createPayloadSection(annotations) {
    const items = [];

    if (annotations.request) {
      items.push(this.createPayloadItem('Request', annotations.request, '#2196f3'));
    }

    if (annotations.response) {
      items.push(this.createPayloadItem('Response', annotations.response, '#4caf50'));
    }

    return `
      <div class="step-details-section" style="margin-bottom: ${PANEL_CONFIG.sectionSpacing}px;">
        ${this.createSectionTitle('Payload Schema')}
        <div style="margin-top: 6px;">
          ${items.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Create a single payload item (request or response)
   * @param {string} label - Label text
   * @param {object} payload - Payload object with type and schema/url
   * @param {string} color - Badge color
   * @returns {string} HTML string
   */
  createPayloadItem(label, payload, color) {
    let content = '';
    
    if (payload.type === 'reference') {
      content = `
        <a href="${this.escapeHtml(payload.url)}" style="
          color: ${color};
          text-decoration: none;
          font-family: monospace;
          font-size: 12px;
        " target="_blank">
          🔗 ${this.escapeHtml(payload.url)}
        </a>
      `;
    } else if (payload.type === 'inline') {
      content = `
        <code style="
          display: block;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          color: #333;
          white-space: pre-wrap;
          word-break: break-word;
        ">${this.escapeHtml(payload.schema)}</code>
      `;
    }

    return `
      <div style="margin-bottom: ${PANEL_CONFIG.rowSpacing}px;">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        ">
          <span style="
            background: ${color};
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
          ">${label}</span>
        </div>
        ${content}
      </div>
    `;
  }

  /**
   * Create flows section showing which flows include this step
   * @param {Array<string>} flowIds - Array of flow IDs
   * @returns {string} HTML string
   */
  createFlowsSection(flowIds) {
    const flowItems = flowIds.map(flowId => {
      const flow = this.ast.flows?.find(f => f.id === flowId);
      const displayName = flow?.displayName || flowId;
      const color = flow?.color || '#888888';

      return `
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 4px 10px;
          border-radius: 4px;
          margin-right: 8px;
          margin-bottom: 6px;
        ">
          <span style="
            width: 10px;
            height: 10px;
            border-radius: 2px;
            background: ${color};
          "></span>
          <span style="
            font-size: 13px;
            color: #333;
          ">${this.escapeHtml(displayName)}</span>
        </span>
      `;
    }).join('');

    return `
      <div class="step-details-section" style="margin-bottom: ${PANEL_CONFIG.sectionSpacing}px;">
        ${this.createSectionTitle('Included in Flows')}
        <div style="
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
        ">
          ${flowItems}
        </div>
      </div>
    `;
  }

  /**
   * Create a section title element
   * @param {string} title - Section title
   * @returns {string} HTML string
   */
  createSectionTitle(title) {
    return `
      <div style="
        font-size: ${PANEL_CONFIG.labelFontSize}px;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      ">${this.escapeHtml(title)}</div>
    `;
  }

  /**
   * Create a detail row with label and value
   * @param {string} label - Row label
   * @param {string} value - Row value
   * @returns {string} HTML string
   */
  createDetailRow(label, value) {
    return `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="
          font-size: ${PANEL_CONFIG.labelFontSize}px;
          color: #6c757d;
          min-width: 60px;
        ">${this.escapeHtml(label)}:</span>
        <span style="
          font-size: ${PANEL_CONFIG.valueFontSize}px;
          color: #333;
        ">${this.escapeHtml(value)}</span>
      </div>
    `;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
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
   * Get the current message being displayed
   * @returns {object|null} The current message or null
   */
  getCurrentMessage() {
    return this.currentMessage;
  }

  /**
   * Destroy the panel and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.panelElement = null;
    this.currentMessage = null;
    this.ast = null;
  }
}
