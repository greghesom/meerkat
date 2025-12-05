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

    // Render participants (boxes at the top)
    const participantPositions = this.renderParticipants(ast.participants);

    // Render lifelines
    this.renderLifelines(participantPositions, dimensions.height);

    // Render messages with arrows
    this.renderMessages(ast.messages, participantPositions, state);

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

    const width = numParticipants > 0
      ? padding * 2 + (numParticipants - 1) * participantGap + this.options.participantWidth
      : 400;

    const height = padding * 2 + participantHeight + 30 + numMessages * messageGap + 50;

    return { width, height };
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
   * Render participant boxes
   */
  renderParticipants(participants) {
    const positions = new Map();
    const { padding, participantGap, participantWidth, participantHeight } = this.options;

    const group = this.createGroup('participants');

    participants.forEach((participant, index) => {
      const x = padding + index * participantGap;
      const y = padding;

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
  renderLifelines(positions, height) {
    const group = this.createGroup('lifelines');
    const { padding, participantHeight } = this.options;

    positions.forEach((pos) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pos.x);
      line.setAttribute('y1', padding + participantHeight);
      line.setAttribute('x2', pos.x);
      line.setAttribute('y2', height - padding);
      line.setAttribute('class', 'lifeline');
      line.setAttribute('stroke', '#cccccc');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '5,5');

      group.appendChild(line);
    });

    this.svg.appendChild(group);
  }

  /**
   * Render messages with arrows
   */
  renderMessages(messages, positions, state) {
    const { padding, participantHeight, messageGap } = this.options;
    const startY = padding + participantHeight + 30;

    const group = this.createGroup('messages');

    messages.forEach((message, index) => {
      const y = startY + index * messageGap;
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
      path.setAttribute('stroke-dasharray', '5,3');
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
      line.setAttribute('stroke-dasharray', '5,3');
    }

    // Arrow marker
    const markerId = message.arrow.head === 'open' ? 'arrow-open' : 'arrow-filled';
    line.setAttribute('marker-end', `url(#${markerId})`);

    return line;
  }

  /**
   * Create message label
   */
  createMessageLabel(sourcePos, targetPos, y, message) {
    const midX = (sourcePos.x + targetPos.x) / 2;

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
}
