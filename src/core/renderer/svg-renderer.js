/**
 * Default stroke dash pattern for async/dashed arrows
 */
const DASH_PATTERN = '5,3';

/**
 * Default lifeline dash pattern
 */
const LIFELINE_DASH_PATTERN = '5,5';

/**
 * HTTP method colors for visual distinction
 */
const HTTP_METHOD_COLORS = {
  GET: { bg: '#61affe', text: '#ffffff' },
  POST: { bg: '#49cc90', text: '#ffffff' },
  PUT: { bg: '#fca130', text: '#ffffff' },
  DELETE: { bg: '#f93e3e', text: '#ffffff' },
  PATCH: { bg: '#50e3c2', text: '#ffffff' },
  HEAD: { bg: '#9012fe', text: '#ffffff' },
  OPTIONS: { bg: '#0d5aa7', text: '#ffffff' },
};

/**
 * Request type (protocol) colors for visual distinction
 */
const REQUEST_TYPE_COLORS = {
  JSON: { bg: '#4caf50', text: '#ffffff', icon: '{ }' },
  SOAP: { bg: '#ff9800', text: '#ffffff', icon: '◇' },
  XML: { bg: '#9c27b0', text: '#ffffff', icon: '< >' },
  RFC_SAP: { bg: '#1976d2', text: '#ffffff', icon: '◈' },
  GRAPHQL: { bg: '#e535ab', text: '#ffffff', icon: '◆' },
  GRPC: { bg: '#244c5a', text: '#ffffff', icon: '⇌' },
  BINARY: { bg: '#607d8b', text: '#ffffff', icon: '01' },
};

/**
 * Default colors for custom/unknown request types
 */
const DEFAULT_REQUEST_TYPE_COLOR = { bg: '#757575', text: '#ffffff', icon: '●' };

/**
 * Payload annotation colors
 */
const PAYLOAD_COLORS = {
  request: { bg: '#2196f3', text: '#ffffff', icon: '→' },
  response: { bg: '#4caf50', text: '#ffffff', icon: '←' },
};

/**
 * API path badge styling constants
 */
const BADGE_CONFIG = {
  height: 16,
  padding: 8,
  gap: 2,
  methodCharWidth: 7,
  pathCharWidth: 6,
  labelOffset: 5,
  labelSpacing: 10,
  messageLabelCharWidth: 3.5,
};

/**
 * Flow legend styling constants
 */
const FLOW_LEGEND_CONFIG = {
  titleWidth: 50,
  colorBoxSize: 12,
  colorBoxRadius: 2,
  colorBoxToTextGap: 4,
  itemGap: 20,
  charWidth: 6,
  fontSize: 10,
  bottomOffset: 20,
};

/**
 * Neutral color for shared messages (messages assigned to multiple flows)
 */
const SHARED_MESSAGE_COLOR = '#888888';

/**
 * SVG Renderer for sequence diagrams
 */
export class SVGRenderer {
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      width: options.width || 'auto',
      height: options.height || 'auto',
      padding: options.padding || 40,
      participantGap: options.participantGap || 150,
      messageGap: options.messageGap || 50,
      participantWidth: options.participantWidth || 120,
      participantHeight: options.participantHeight || 40,
      theme: options.theme || 'light',
      dashPattern: options.dashPattern || DASH_PATTERN,
      lifelineDashPattern: options.lifelineDashPattern || LIFELINE_DASH_PATTERN,
      ...options,
    };

    this.svg = null;
    this.defs = null;
  }

  /**
   * Render the complete diagram
   */
  render(ast, state = {}) {
    // Store flows for color lookup
    this.flows = ast.flows || [];
    
    // Store active flow from state for filtering
    this.activeFlow = state.activeFlow || null;

    // Calculate dimensions
    const dimensions = this.calculateDimensions(ast);

    // Create SVG element
    this.svg = this.createSVG(dimensions);

    // Create defs for markers
    this.defs = this.createDefs();

    // Render title if present
    if (ast.title) {
      this.renderTitle(ast.title, dimensions);
    }

    // Render participants (boxes at the top)
    const participantPositions = this.renderParticipants(ast.participants, ast.title);

    // Render lifelines
    this.renderLifelines(participantPositions, dimensions.height - dimensions.legendHeight - dimensions.flowLegendHeight, ast.title);

    // Render messages with arrows
    this.renderMessages(ast.messages, participantPositions, state, ast.title, dimensions);

    // Render flow color legend if there are flows defined
    if (this.flows.length > 0) {
      this.renderFlowLegend(dimensions);
    }

    // Render protocol legend if there are request types used
    if (dimensions.usedRequestTypes && dimensions.usedRequestTypes.length > 0) {
      this.renderProtocolLegend(dimensions);
    }

    // Clear and append to container
    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(this.svg);
    }

    return this.svg;
  }

  /**
   * Calculate diagram dimensions based on content
   */
  calculateDimensions(ast) {
    const { padding, participantGap, participantHeight, messageGap } = this.options;

    const numParticipants = ast.participants.length;
    const numMessages = ast.messages.length;

    // Add height for title if present
    const titleHeight = ast.title ? 40 : 0;

    // Check if any messages have path or request type annotations (need extra height)
    const hasPathAnnotations = ast.messages.some(m => m.annotations?.path);
    const hasRequestTypeAnnotations = ast.messages.some(m => m.annotations?.requestType);
    const hasTimeoutAnnotations = ast.messages.some(m => m.annotations?.timeout);
    const hasQueueAnnotations = ast.messages.some(m => m.annotations?.queue);
    const hasRequestPayloadAnnotations = ast.messages.some(m => m.annotations?.request);
    const hasResponsePayloadAnnotations = ast.messages.some(m => m.annotations?.response);
    
    // Collect unique request types used in the diagram
    const usedRequestTypes = [...new Set(
      ast.messages
        .filter(m => m.annotations?.requestType)
        .map(m => m.annotations.requestType.toUpperCase())
    )];
    
    // Calculate legend height if there are request types used
    const legendHeight = usedRequestTypes.length > 0 ? 50 : 0;

    // Calculate flow legend height if there are flows defined
    const flowLegendHeight = (ast.flows && ast.flows.length > 0) ? 40 : 0;
    
    // Calculate extra height needed for annotations
    let annotationExtraHeight = 0;
    if (hasPathAnnotations) annotationExtraHeight += 15;
    if (hasRequestTypeAnnotations) annotationExtraHeight += 15;
    if (hasTimeoutAnnotations || hasQueueAnnotations) annotationExtraHeight += 12;
    if (hasRequestPayloadAnnotations) annotationExtraHeight += 18;
    if (hasResponsePayloadAnnotations) annotationExtraHeight += 18;
    
    const effectiveMessageGap = messageGap + annotationExtraHeight;

    const width = numParticipants > 0
      ? padding * 2 + (numParticipants - 1) * participantGap + this.options.participantWidth
      : 400;

    const height = padding * 2 + titleHeight + participantHeight + 30 + numMessages * effectiveMessageGap + 50 + legendHeight + flowLegendHeight;

    return { width, height, titleHeight, effectiveMessageGap, usedRequestTypes, legendHeight, flowLegendHeight };
  }

  /**
   * Create the main SVG element
   */
  createSVG(dimensions) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', dimensions.width);
    svg.setAttribute('height', dimensions.height);
    svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.setAttribute('class', `sequence-diagram theme-${this.options.theme}`);
    return svg;
  }

  /**
   * Create SVG defs for markers
   */
  createDefs() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Create default arrow markers for solid and dashed lines
    defs.appendChild(this.createArrowMarker('arrow-filled', '#333333', false));
    defs.appendChild(this.createArrowMarker('arrow-open', '#333333', true));

    // Create colored arrow markers for each flow
    if (this.flows) {
      this.flows.forEach(flow => {
        const color = flow.color || '#333333';
        const safeId = this.sanitizeFlowId(flow.id);
        defs.appendChild(this.createArrowMarker(`arrow-filled-${safeId}`, color, false));
        defs.appendChild(this.createArrowMarker(`arrow-open-${safeId}`, color, true));
      });
    }

    this.svg.appendChild(defs);
    return defs;
  }

  /**
   * Sanitize flow ID for use in marker IDs (remove special characters)
   */
  sanitizeFlowId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Get the color for a flow by ID
   */
  getFlowColor(flowId) {
    if (!flowId || !this.flows) return null;
    const flow = this.flows.find(f => f.id === flowId);
    return flow ? flow.color : null;
  }

  /**
   * Get the color for a message based on its flow assignments and active flow state
   * @param {Array<string>} flowIds - Array of flow IDs the message belongs to
   * @returns {string|null} - Color to use for the message, or null for default
   */
  getMessageFlowColor(flowIds) {
    if (!flowIds || flowIds.length === 0) return null;
    
    // If there's an active flow, use its color if the message belongs to it
    if (this.activeFlow) {
      if (flowIds.includes(this.activeFlow)) {
        return this.getFlowColor(this.activeFlow);
      }
      // Message doesn't belong to active flow
      return null;
    }
    
    // No active flow - check if message has multiple flows (shared message)
    if (flowIds.length > 1) {
      // Shared message - use neutral color
      return SHARED_MESSAGE_COLOR;
    }
    
    // Single flow - use that flow's color
    return this.getFlowColor(flowIds[0]);
  }

  /**
   * Check if a message should be visible based on active flow
   * @param {Array<string>} flowIds - Array of flow IDs the message belongs to
   * @returns {boolean} - True if message should be visible
   */
  isMessageVisible(flowIds) {
    // If no active flow is set, all messages are visible
    if (!this.activeFlow) return true;
    
    // If message has no flow assignments, it's always visible
    if (!flowIds || flowIds.length === 0) return true;
    
    // Message is visible if it belongs to the active flow
    return flowIds.includes(this.activeFlow);
  }

  /**
   * Create arrow marker definition
   */
  createArrowMarker(id, color, open = false) {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', open ? 'M 0 0 L 10 5 L 0 10' : 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('fill', open ? 'none' : color);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1');

    marker.appendChild(path);
    return marker;
  }

  /**
   * Create a group element
   */
  createGroup(className) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (className) {
      group.setAttribute('class', className);
    }
    return group;
  }

  /**
   * Render title prominently above the diagram
   */
  renderTitle(title, dimensions) {
    const { padding } = this.options;
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', dimensions.width / 2);
    text.setAttribute('y', padding + 10);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('class', 'diagram-title');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-size', '18');
    text.setAttribute('font-weight', '600');
    text.setAttribute('fill', '#1a1a1a');
    text.textContent = title;

    this.svg.appendChild(text);
  }

  /**
   * Render participant boxes
   */
  renderParticipants(participants, hasTitle) {
    const positions = new Map();
    const { padding, participantGap, participantWidth, participantHeight } = this.options;

    // Add offset for title if present
    const titleOffset = hasTitle ? 40 : 0;

    const group = this.createGroup('participants');

    participants.forEach((participant, index) => {
      const x = padding + index * participantGap;
      const y = padding + titleOffset;

      // Store center position for message routing
      positions.set(participant.id, {
        x: x + participantWidth / 2,
        y: y + participantHeight,
        index,
      });

      // Background rect
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', participantWidth);
      rect.setAttribute('height', participantHeight);
      rect.setAttribute('rx', '4');
      rect.setAttribute('class', 'participant-box');
      rect.setAttribute('fill', '#ffffff');
      rect.setAttribute('stroke', '#333333');
      rect.setAttribute('stroke-width', '2');

      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + participantWidth / 2);
      text.setAttribute('y', y + participantHeight / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('class', 'participant-label');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '500');
      text.setAttribute('fill', '#333333');
      text.textContent = participant.displayName || participant.id;

      group.appendChild(rect);
      group.appendChild(text);
    });

    this.svg.appendChild(group);
    return positions;
  }

  /**
   * Render lifelines from participant boxes down
   */
  renderLifelines(positions, height, hasTitle) {
    const group = this.createGroup('lifelines');
    const { padding, participantHeight } = this.options;

    // Add offset for title if present
    const titleOffset = hasTitle ? 40 : 0;

    positions.forEach((pos) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pos.x);
      line.setAttribute('y1', padding + titleOffset + participantHeight);
      line.setAttribute('x2', pos.x);
      line.setAttribute('y2', height - padding);
      line.setAttribute('class', 'lifeline');
      line.setAttribute('stroke', '#cccccc');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', this.options.lifelineDashPattern);

      group.appendChild(line);
    });

    this.svg.appendChild(group);
  }

  /**
   * Render messages with arrows
   */
  renderMessages(messages, positions, state, hasTitle, dimensions) {
    const { padding, participantHeight, messageGap } = this.options;

    // Use effective message gap from dimensions (accounts for path annotations)
    const effectiveMessageGap = dimensions?.effectiveMessageGap || messageGap;

    // Add offset for title if present
    const titleOffset = hasTitle ? 40 : 0;
    const startY = padding + titleOffset + participantHeight + 30;

    const group = this.createGroup('messages');

    messages.forEach((message, index) => {
      const y = startY + index * effectiveMessageGap;
      const sourcePos = positions.get(message.source);
      const targetPos = positions.get(message.target);

      if (!sourcePos || !targetPos) return;

      // Get flow assignments for visibility check
      const flowIds = message.annotations?.flows || [];
      const isVisible = this.isMessageVisible(flowIds);

      // Create message group with visibility class
      let className = `message-${index}`;
      if (!isVisible) {
        className += ' flow-hidden';
      }
      const messageGroup = this.createGroup(className);

      // Check if this is a self-referencing message
      if (message.source === message.target) {
        this.renderSelfMessage(messageGroup, sourcePos, y, message);
      } else {
        // Draw arrow line
        const line = this.createMessageLine(sourcePos, targetPos, y, message);
        messageGroup.appendChild(line);

        // Draw message label
        const label = this.createMessageLabel(sourcePos, targetPos, y, message);
        messageGroup.appendChild(label);
      }

      group.appendChild(messageGroup);
    });

    this.svg.appendChild(group);
  }

  /**
   * Render a self-referencing message (loops back to same participant)
   */
  renderSelfMessage(group, pos, y, message) {
    const loopWidth = 40;
    const loopHeight = 20;

    // Get flow color based on flow assignments and active flow state
    const flowIds = message.annotations?.flows || [];
    const flowColor = this.getMessageFlowColor(flowIds);
    const strokeColor = flowColor || '#333333';

    // Create path for loop
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${pos.x} ${y} 
               L ${pos.x + loopWidth} ${y} 
               L ${pos.x + loopWidth} ${y + loopHeight} 
               L ${pos.x} ${y + loopHeight}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', '2');

    if (message.arrow.line === 'dashed' || message.annotations.isAsync) {
      path.setAttribute('stroke-dasharray', this.options.dashPattern);
    }

    // Arrow marker (use flow-specific marker if available)
    let markerId;
    // Determine which flow ID to use for the marker
    const effectiveFlowId = this.activeFlow && flowIds.includes(this.activeFlow) 
      ? this.activeFlow 
      : (flowIds.length === 1 ? flowIds[0] : null);
    
    if (effectiveFlowId && this.getFlowColor(effectiveFlowId)) {
      const safeId = this.sanitizeFlowId(effectiveFlowId);
      markerId = message.arrow.head === 'open' ? `arrow-open-${safeId}` : `arrow-filled-${safeId}`;
    } else {
      markerId = message.arrow.head === 'open' ? 'arrow-open' : 'arrow-filled';
    }
    path.setAttribute('marker-end', `url(#${markerId})`);

    group.appendChild(path);

    // Add label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x + loopWidth + 5);
    text.setAttribute('y', y + loopHeight / 2);
    text.setAttribute('text-anchor', 'start');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('class', 'message-label');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', strokeColor);
    text.textContent = message.text;

    group.appendChild(text);

    // Add API path badge if present
    if (message.annotations?.path) {
      const textWidth = message.text.length * BADGE_CONFIG.pathCharWidth / 2;
      const pathBadge = this.createApiPathBadge(
        pos.x + loopWidth + BADGE_CONFIG.labelOffset + textWidth + BADGE_CONFIG.labelSpacing,
        y + loopHeight / 2,
        message.annotations
      );
      group.appendChild(pathBadge);
    }

    // Add request type badge if present
    if (message.annotations?.requestType) {
      const textWidth = message.text.length * BADGE_CONFIG.pathCharWidth / 2;
      const pathBadgeOffset = message.annotations?.path ? 80 : 0; // Offset if path badge exists
      const typeBadge = this.createRequestTypeBadge(
        pos.x + loopWidth + BADGE_CONFIG.labelOffset + textWidth + BADGE_CONFIG.labelSpacing + pathBadgeOffset,
        y + loopHeight / 2 - 16, // Place above path badge
        message.annotations.requestType
      );
      group.appendChild(typeBadge);
    }
  }

  /**
   * Create the message line/arrow
   */
  createMessageLine(sourcePos, targetPos, y, message) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', sourcePos.x);
    line.setAttribute('y1', y);
    line.setAttribute('x2', targetPos.x);
    line.setAttribute('y2', y);

    // Get flow color based on flow assignments and active flow state
    const flowIds = message.annotations?.flows || [];
    const flowColor = this.getMessageFlowColor(flowIds);
    const strokeColor = flowColor || '#333333';

    line.setAttribute('stroke', strokeColor);
    line.setAttribute('stroke-width', '2');

    // Dashed line for async
    if (message.arrow.line === 'dashed' || message.annotations.isAsync) {
      line.setAttribute('stroke-dasharray', this.options.dashPattern);
    }

    // Arrow marker (use flow-specific marker if available)
    let markerId;
    // Determine which flow ID to use for the marker
    const effectiveFlowId = this.activeFlow && flowIds.includes(this.activeFlow) 
      ? this.activeFlow 
      : (flowIds.length === 1 ? flowIds[0] : null);
    
    if (effectiveFlowId && this.getFlowColor(effectiveFlowId)) {
      const safeId = this.sanitizeFlowId(effectiveFlowId);
      markerId = message.arrow.head === 'open' ? `arrow-open-${safeId}` : `arrow-filled-${safeId}`;
    } else {
      markerId = message.arrow.head === 'open' ? 'arrow-open' : 'arrow-filled';
    }
    line.setAttribute('marker-end', `url(#${markerId})`);

    return line;
  }

  /**
   * Create message label with optional API path and request type annotations
   */
  createMessageLabel(sourcePos, targetPos, y, message) {
    const midX = (sourcePos.x + targetPos.x) / 2;
    const hasPath = message.annotations?.path;
    const hasRequestType = message.annotations?.requestType;
    const hasTimeout = message.annotations?.timeout;
    const hasQueue = message.annotations?.queue;
    const isAsync = message.annotations?.isAsync;
    const hasRequest = message.annotations?.request;
    const hasResponse = message.annotations?.response;

    // Get flow color for text based on flow assignments and active flow state
    const flowIds = message.annotations?.flows || [];
    const flowColor = this.getMessageFlowColor(flowIds);
    const textColor = flowColor || '#333333';

    // If there are any annotations, create a group containing label and badges
    if (hasPath || hasRequestType || hasTimeout || hasQueue || isAsync || hasRequest || hasResponse) {
      const group = this.createGroup('message-label-group');

      // Create message text with optional async icon
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX);
      text.setAttribute('y', y - 20);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'message-label');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', textColor);
      text.textContent = message.text;
      group.appendChild(text);

      // Add async/sync indicator icon if explicitly marked
      if (isAsync) {
        const asyncIcon = this.createAsyncIcon(midX + (message.text.length * BADGE_CONFIG.messageLabelCharWidth) + 10, y - 20);
        group.appendChild(asyncIcon);
      }

      // Calculate badge positions
      let badgeY = y - 8;
      
      // Create request type badge if present
      if (hasRequestType) {
        const typeBadge = this.createRequestTypeBadge(midX, badgeY, message.annotations.requestType);
        group.appendChild(typeBadge);
        
        // If there's also a path, offset it below the type badge
        if (hasPath) {
          badgeY = y + 8;
        }
      }

      // Create API path badge if present
      if (hasPath) {
        const pathBadge = this.createApiPathBadge(midX, hasRequestType ? badgeY : y - 8, message.annotations);
        group.appendChild(pathBadge);
      }

      // Create timeout/queue indicator below the arrow line
      if (hasTimeout || hasQueue) {
        const indicatorBadge = this.createSyncAsyncIndicator(midX, y + 12, message.annotations);
        group.appendChild(indicatorBadge);
      }

      // Create request/response payload badges
      let payloadY = y + (hasTimeout || hasQueue ? 26 : 12);
      
      if (hasRequest) {
        const requestBadge = this.createPayloadBadge(midX, payloadY, 'request', message.annotations.request);
        group.appendChild(requestBadge);
        payloadY += 18;
      }
      
      if (hasResponse) {
        const responseBadge = this.createPayloadBadge(midX, payloadY, 'response', message.annotations.response);
        group.appendChild(responseBadge);
      }

      return group;
    }

    // No annotations - just return the text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', y - 8);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'message-label');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', textColor);
    text.textContent = message.text;

    return text;
  }

  /**
   * Create async clock icon for async messages
   */
  createAsyncIcon(x, y) {
    const group = this.createGroup('async-icon');
    
    // Clock circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#ff9800');
    circle.setAttribute('stroke-width', '1.5');
    group.appendChild(circle);
    
    // Clock hands
    const hands = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hands.setAttribute('d', `M ${x} ${y} L ${x} ${y - 3} M ${x} ${y} L ${x + 2} ${y + 1}`);
    hands.setAttribute('stroke', '#ff9800');
    hands.setAttribute('stroke-width', '1.5');
    hands.setAttribute('stroke-linecap', 'round');
    group.appendChild(hands);
    
    // Tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = 'Asynchronous';
    group.appendChild(title);
    
    return group;
  }

  /**
   * Create sync/async indicator badge with timeout and queue info
   */
  createSyncAsyncIndicator(x, y, annotations) {
    const group = this.createGroup('sync-async-indicator');
    
    let badgeText = '';
    if (annotations.timeout) {
      badgeText += `⏱ ${annotations.timeout}`;
    }
    if (annotations.queue) {
      if (badgeText) badgeText += ' ';
      badgeText += `📥 ${annotations.queue}`;
    }
    
    if (!badgeText) return group;
    
    // Calculate badge dimensions
    const charWidth = 6;
    const padding = 8;
    const height = 14;
    const badgeWidth = badgeText.length * charWidth + padding;
    const startX = x - badgeWidth / 2;
    
    // Badge background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', startX);
    rect.setAttribute('y', y - height / 2);
    rect.setAttribute('width', badgeWidth);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', '3');
    rect.setAttribute('fill', '#e3f2fd');
    rect.setAttribute('stroke', '#90caf9');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('class', 'sync-async-badge');
    group.appendChild(rect);
    
    // Badge text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-size', '9');
    text.setAttribute('fill', '#1565c0');
    text.textContent = badgeText;
    group.appendChild(text);
    
    // Tooltip with full info
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    let tooltipText = '';
    if (annotations.timeout) tooltipText += `Timeout: ${annotations.timeout}`;
    if (annotations.queue) {
      if (tooltipText) tooltipText += '\n';
      tooltipText += `Queue: ${annotations.queue}`;
    }
    title.textContent = tooltipText;
    group.appendChild(title);
    
    return group;
  }

  /**
   * Create payload badge for request/response schema hints
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} type - Must be 'request' or 'response'
   * @param {object} payload - Payload object with type and schema/url
   */
  createPayloadBadge(x, y, type, payload) {
    // Validate type parameter
    const validTypes = ['request', 'response'];
    const safeType = validTypes.includes(type) ? type : 'request';
    
    const group = this.createGroup(`payload-badge payload-${safeType}`);
    
    if (!payload) return group;
    
    const colors = PAYLOAD_COLORS[safeType];
    const label = safeType === 'request' ? 'REQ' : 'RES';
    
    // Determine display text and tooltip
    let displayText = label;
    let tooltipText = '';
    
    if (payload.type === 'reference') {
      displayText = `${label} 🔗`;
      tooltipText = `${safeType === 'request' ? 'Request' : 'Response'} Schema: ${payload.url}`;
    } else if (payload.type === 'inline') {
      displayText = `${label}: ${this.truncateText(payload.schema, 25)}`;
      tooltipText = `${safeType === 'request' ? 'Request' : 'Response'} Schema:\n${payload.schema}`;
    }
    
    // Calculate badge dimensions
    const charWidth = 6;
    const padding = 12;
    const height = 16;
    const badgeWidth = Math.min(displayText.length * charWidth + padding, 200);
    const startX = x - badgeWidth / 2;
    
    // Badge background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', startX);
    rect.setAttribute('y', y - height / 2);
    rect.setAttribute('width', badgeWidth);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', '3');
    rect.setAttribute('fill', colors.bg);
    rect.setAttribute('stroke', colors.bg);
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('class', `payload-badge-bg payload-${safeType}-bg`);
    rect.setAttribute('style', 'cursor: pointer;');
    group.appendChild(rect);
    
    // Badge text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-family', 'monospace');
    text.setAttribute('font-size', '9');
    text.setAttribute('font-weight', '500');
    text.setAttribute('fill', colors.text);
    text.setAttribute('style', 'cursor: pointer;');
    text.textContent = this.truncateText(displayText, 30);
    group.appendChild(text);
    
    // Tooltip with full schema info
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = tooltipText;
    group.appendChild(title);
    
    return group;
  }

  /**
   * Truncate text to specified length with ellipsis
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '…';
  }

  /**
   * Create request type badge with protocol color coding
   */
  createRequestTypeBadge(x, y, requestType) {
    const group = this.createGroup('request-type-badge');
    
    // Normalize the request type to uppercase for lookup
    const normalizedType = requestType?.toUpperCase() || '';
    
    // Get colors for the request type (support both standard and custom types)
    const colors = REQUEST_TYPE_COLORS[normalizedType] || DEFAULT_REQUEST_TYPE_COLOR;

    // Calculate badge dimensions
    const { height, padding } = BADGE_CONFIG;
    const typeText = requestType || '';
    const charWidth = 7; // Character width for type badge
    const badgeWidth = typeText.length * charWidth + padding;
    const startX = x - badgeWidth / 2;

    // Type background
    const typeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    typeRect.setAttribute('x', startX);
    typeRect.setAttribute('y', y - height / 2);
    typeRect.setAttribute('width', badgeWidth);
    typeRect.setAttribute('height', height);
    typeRect.setAttribute('rx', '3');
    typeRect.setAttribute('fill', colors.bg);
    typeRect.setAttribute('class', `request-type request-type-${normalizedType.toLowerCase().replace('_', '-')}`);
    group.appendChild(typeRect);

    // Type text
    const typeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    typeLabel.setAttribute('x', startX + badgeWidth / 2);
    typeLabel.setAttribute('y', y);
    typeLabel.setAttribute('text-anchor', 'middle');
    typeLabel.setAttribute('dominant-baseline', 'middle');
    typeLabel.setAttribute('font-family', 'monospace');
    typeLabel.setAttribute('font-size', '10');
    typeLabel.setAttribute('font-weight', '600');
    typeLabel.setAttribute('fill', colors.text);
    typeLabel.textContent = requestType;
    group.appendChild(typeLabel);

    // Add tooltip with type info
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `Protocol: ${requestType}`;
    group.appendChild(title);

    return group;
  }

  /**
   * Create API path badge with HTTP method color coding
   */
  createApiPathBadge(x, y, annotations) {
    const group = this.createGroup('api-path-badge');
    const method = annotations.method;
    const path = annotations.path;

    // Get colors for the HTTP method
    const colors = HTTP_METHOD_COLORS[method] || { bg: '#666666', text: '#ffffff' };

    // Calculate badge dimensions using configuration
    const { height, padding, gap, methodCharWidth, pathCharWidth } = BADGE_CONFIG;
    const methodText = method || '';
    const pathText = path || '';
    const methodWidth = methodText.length * methodCharWidth + padding;
    const pathWidth = pathText.length * pathCharWidth + padding;
    const totalWidth = methodWidth + pathWidth + (gap * 2);
    const startX = x - totalWidth / 2;

    // Create method badge (if method exists)
    if (method) {
      // Method background
      const methodRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      methodRect.setAttribute('x', startX);
      methodRect.setAttribute('y', y - height / 2);
      methodRect.setAttribute('width', methodWidth);
      methodRect.setAttribute('height', height);
      methodRect.setAttribute('rx', '3');
      methodRect.setAttribute('fill', colors.bg);
      methodRect.setAttribute('class', `http-method http-method-${method.toLowerCase()}`);
      group.appendChild(methodRect);

      // Method text
      const methodLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      methodLabel.setAttribute('x', startX + methodWidth / 2);
      methodLabel.setAttribute('y', y);
      methodLabel.setAttribute('text-anchor', 'middle');
      methodLabel.setAttribute('dominant-baseline', 'middle');
      methodLabel.setAttribute('font-family', 'monospace');
      methodLabel.setAttribute('font-size', '10');
      methodLabel.setAttribute('font-weight', '600');
      methodLabel.setAttribute('fill', colors.text);
      methodLabel.textContent = method;
      group.appendChild(methodLabel);
    }

    // Create path badge
    const pathStartX = method ? startX + methodWidth + gap : startX;

    // Path background
    const pathRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    pathRect.setAttribute('x', pathStartX);
    pathRect.setAttribute('y', y - height / 2);
    pathRect.setAttribute('width', pathWidth);
    pathRect.setAttribute('height', height);
    pathRect.setAttribute('rx', '3');
    pathRect.setAttribute('fill', '#f0f0f0');
    pathRect.setAttribute('stroke', '#cccccc');
    pathRect.setAttribute('stroke-width', '1');
    pathRect.setAttribute('class', 'api-path');
    group.appendChild(pathRect);

    // Path text
    const pathLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    pathLabel.setAttribute('x', pathStartX + pathWidth / 2);
    pathLabel.setAttribute('y', y);
    pathLabel.setAttribute('text-anchor', 'middle');
    pathLabel.setAttribute('dominant-baseline', 'middle');
    pathLabel.setAttribute('font-family', 'monospace');
    pathLabel.setAttribute('font-size', '10');
    pathLabel.setAttribute('fill', '#333333');
    pathLabel.textContent = path;
    group.appendChild(pathLabel);

    // Add tooltip with full path info
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = method ? `${method} ${path}` : path;
    group.appendChild(title);

    return group;
  }

  /**
   * Render flow color legend at the bottom of the diagram
   */
  renderFlowLegend(dimensions) {
    const { padding } = this.options;
    const group = this.createGroup('flow-legend');
    
    // Position flow legend above the protocol legend
    const legendY = dimensions.height - dimensions.legendHeight - FLOW_LEGEND_CONFIG.bottomOffset;
    const legendStartX = padding;
    
    // Legend title
    const legendTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    legendTitle.setAttribute('x', legendStartX);
    legendTitle.setAttribute('y', legendY);
    legendTitle.setAttribute('text-anchor', 'start');
    legendTitle.setAttribute('dominant-baseline', 'middle');
    legendTitle.setAttribute('font-family', 'sans-serif');
    legendTitle.setAttribute('font-size', '11');
    legendTitle.setAttribute('font-weight', '600');
    legendTitle.setAttribute('fill', '#666666');
    legendTitle.textContent = 'Flows:';
    group.appendChild(legendTitle);
    
    // Render each flow as a legend item
    let currentX = legendStartX + FLOW_LEGEND_CONFIG.titleWidth;
    const { colorBoxSize, colorBoxRadius, colorBoxToTextGap, itemGap, charWidth, fontSize } = FLOW_LEGEND_CONFIG;
    
    this.flows.forEach(flow => {
      const color = flow.color || '#333333';
      const displayName = flow.displayName || flow.id;
      const textWidth = displayName.length * charWidth;
      
      // Color indicator (small square)
      const colorBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      colorBox.setAttribute('x', currentX);
      colorBox.setAttribute('y', legendY - colorBoxSize / 2);
      colorBox.setAttribute('width', colorBoxSize);
      colorBox.setAttribute('height', colorBoxSize);
      colorBox.setAttribute('rx', colorBoxRadius);
      colorBox.setAttribute('fill', color);
      colorBox.setAttribute('class', 'flow-color-indicator');
      group.appendChild(colorBox);
      
      // Flow name text
      const flowLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      flowLabel.setAttribute('x', currentX + colorBoxSize + colorBoxToTextGap);
      flowLabel.setAttribute('y', legendY);
      flowLabel.setAttribute('text-anchor', 'start');
      flowLabel.setAttribute('dominant-baseline', 'middle');
      flowLabel.setAttribute('font-family', 'sans-serif');
      flowLabel.setAttribute('font-size', fontSize);
      flowLabel.setAttribute('fill', '#333333');
      flowLabel.textContent = displayName;
      group.appendChild(flowLabel);
      
      currentX += colorBoxSize + colorBoxToTextGap + textWidth + itemGap;
    });
    
    this.svg.appendChild(group);
  }

  /**
   * Render protocol legend at the bottom of the diagram
   */
  renderProtocolLegend(dimensions) {
    const { padding } = this.options;
    const group = this.createGroup('protocol-legend');
    
    const legendY = dimensions.height - 30;
    const legendStartX = padding;
    
    // Legend title
    const legendTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    legendTitle.setAttribute('x', legendStartX);
    legendTitle.setAttribute('y', legendY);
    legendTitle.setAttribute('text-anchor', 'start');
    legendTitle.setAttribute('dominant-baseline', 'middle');
    legendTitle.setAttribute('font-family', 'sans-serif');
    legendTitle.setAttribute('font-size', '11');
    legendTitle.setAttribute('font-weight', '600');
    legendTitle.setAttribute('fill', '#666666');
    legendTitle.textContent = 'Protocols:';
    group.appendChild(legendTitle);
    
    // Render each used request type as a legend item
    let currentX = legendStartX + 70;
    const { height } = BADGE_CONFIG;
    
    dimensions.usedRequestTypes.forEach(requestType => {
      const colors = REQUEST_TYPE_COLORS[requestType] || DEFAULT_REQUEST_TYPE_COLOR;
      const charWidth = 7;
      const badgeWidth = requestType.length * charWidth + 8;
      
      // Badge background
      const typeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      typeRect.setAttribute('x', currentX);
      typeRect.setAttribute('y', legendY - height / 2);
      typeRect.setAttribute('width', badgeWidth);
      typeRect.setAttribute('height', height);
      typeRect.setAttribute('rx', '3');
      typeRect.setAttribute('fill', colors.bg);
      typeRect.setAttribute('class', `request-type request-type-${requestType.toLowerCase().replace('_', '-')}`);
      group.appendChild(typeRect);
      
      // Badge text
      const typeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      typeLabel.setAttribute('x', currentX + badgeWidth / 2);
      typeLabel.setAttribute('y', legendY);
      typeLabel.setAttribute('text-anchor', 'middle');
      typeLabel.setAttribute('dominant-baseline', 'middle');
      typeLabel.setAttribute('font-family', 'monospace');
      typeLabel.setAttribute('font-size', '10');
      typeLabel.setAttribute('font-weight', '600');
      typeLabel.setAttribute('fill', colors.text);
      typeLabel.textContent = requestType;
      group.appendChild(typeLabel);
      
      currentX += badgeWidth + 10;
    });
    
    this.svg.appendChild(group);
  }
}
