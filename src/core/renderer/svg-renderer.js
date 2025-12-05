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
};

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
    this.renderLifelines(participantPositions, dimensions.height, ast.title);

    // Render messages with arrows
    this.renderMessages(ast.messages, participantPositions, state, ast.title, dimensions);

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

    // Check if any messages have path annotations (need extra height)
    const hasPathAnnotations = ast.messages.some(m => m.annotations?.path);
    const effectiveMessageGap = hasPathAnnotations ? messageGap + 15 : messageGap;

    const width = numParticipants > 0
      ? padding * 2 + (numParticipants - 1) * participantGap + this.options.participantWidth
      : 400;

    const height = padding * 2 + titleHeight + participantHeight + 30 + numMessages * effectiveMessageGap + 50;

    return { width, height, titleHeight, effectiveMessageGap };
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

    // Create arrow markers for solid and dashed lines
    defs.appendChild(this.createArrowMarker('arrow-filled', '#333333', false));
    defs.appendChild(this.createArrowMarker('arrow-open', '#333333', true));

    this.svg.appendChild(defs);
    return defs;
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

      // Create message group
      const messageGroup = this.createGroup(`message-${index}`);

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

    // Create path for loop
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${pos.x} ${y} 
               L ${pos.x + loopWidth} ${y} 
               L ${pos.x + loopWidth} ${y + loopHeight} 
               L ${pos.x} ${y + loopHeight}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#333333');
    path.setAttribute('stroke-width', '2');

    if (message.arrow.line === 'dashed' || message.annotations.isAsync) {
      path.setAttribute('stroke-dasharray', this.options.dashPattern);
    }

    const markerId = message.arrow.head === 'open' ? 'arrow-open' : 'arrow-filled';
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
    text.setAttribute('fill', '#333333');
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
    line.setAttribute('stroke', '#333333');
    line.setAttribute('stroke-width', '2');

    // Dashed line for async
    if (message.arrow.line === 'dashed' || message.annotations.isAsync) {
      line.setAttribute('stroke-dasharray', this.options.dashPattern);
    }

    // Arrow marker
    const markerId = message.arrow.head === 'open' ? 'arrow-open' : 'arrow-filled';
    line.setAttribute('marker-end', `url(#${markerId})`);

    return line;
  }

  /**
   * Create message label with optional API path annotation
   */
  createMessageLabel(sourcePos, targetPos, y, message) {
    const midX = (sourcePos.x + targetPos.x) / 2;
    const hasPath = message.annotations?.path;

    // If there's a path annotation, create a group containing label and path badge
    if (hasPath) {
      const group = this.createGroup('message-label-group');

      // Create message text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX);
      text.setAttribute('y', y - 20);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'message-label');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333333');
      text.textContent = message.text;
      group.appendChild(text);

      // Create API path badge
      const pathBadge = this.createApiPathBadge(midX, y - 8, message.annotations);
      group.appendChild(pathBadge);

      return group;
    }

    // No path annotation - just return the text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', y - 8);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'message-label');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#333333');
    text.textContent = message.text;

    return text;
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
}
