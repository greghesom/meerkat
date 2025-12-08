/**
 * MessageOverlay - Shows message details as overlay on diagram
 */
export class MessageOverlay {
  /**
   * @param {HTMLElement} container - Container for overlay
   */
  constructor(container) {
    this.container = container;
    this.overlay = null;
    this.currentMessage = null;
  }

  /**
   * Show message details
   * @param {Object} message - Message object from sequence diagram
   * @param {Object} position - Position {x, y}
   */
  show(message, position) {
    this.currentMessage = message;
    
    // Reuse overlay if it exists, otherwise create new one
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'message-overlay';
      this.overlay.style.position = 'absolute';
      this.overlay.style.zIndex = '2000';
      this.container.appendChild(this.overlay);
    }
    
    // Update position
    this.overlay.style.left = `${position.x}px`;
    this.overlay.style.top = `${position.y}px`;
    
    // Update content
    this.overlay.innerHTML = this.buildContent(message);
    
    // Adjust position if overlay goes off screen
    this.adjustPosition();
  }

  /**
   * Build overlay content HTML
   * @param {Object} message
   * @returns {string}
   */
  buildContent(message) {
    const parts = [];
    
    // Message text
    parts.push(`<div class="message-overlay-text">${this.escapeHtml(message.text)}</div>`);
    
    // Source and target
    parts.push(`
      <div class="message-overlay-flow">
        <span class="message-overlay-label">From:</span> ${this.escapeHtml(message.source)}<br>
        <span class="message-overlay-label">To:</span> ${this.escapeHtml(message.target)}
      </div>
    `);
    
    // Annotations
    if (message.annotations) {
      const annotations = [];
      
      if (message.annotations.path) {
        annotations.push(`<div>📍 ${this.escapeHtml(message.annotations.path)}</div>`);
      }
      
      if (message.annotations.type) {
        annotations.push(`<div>🔧 Type: ${this.escapeHtml(message.annotations.type)}</div>`);
      }
      
      if (message.annotations.async !== undefined) {
        const asyncText = message.annotations.async ? 'Async' : 'Sync';
        annotations.push(`<div>⏱️ ${asyncText}</div>`);
      }
      
      if (message.annotations.timeout) {
        annotations.push(`<div>⏰ Timeout: ${this.escapeHtml(message.annotations.timeout)}</div>`);
      }
      
      if (message.annotations.queue) {
        annotations.push(`<div>📬 Queue: ${this.escapeHtml(message.annotations.queue)}</div>`);
      }
      
      if (annotations.length > 0) {
        parts.push(`<div class="message-overlay-annotations">${annotations.join('')}</div>`);
      }
    }
    
    return `
      <div class="message-overlay-content">
        ${parts.join('')}
        <button class="message-overlay-close">×</button>
      </div>
    `;
  }

  /**
   * Hide the overlay
   */
  hide() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.currentMessage = null;
  }

  /**
   * Adjust overlay position to keep it on screen
   */
  adjustPosition() {
    if (!this.overlay) return;
    
    const rect = this.overlay.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    let left = parseFloat(this.overlay.style.left);
    let top = parseFloat(this.overlay.style.top);
    
    // Adjust horizontal position
    if (rect.right > containerRect.right) {
      left = containerRect.right - rect.width - 10;
    }
    if (rect.left < containerRect.left) {
      left = containerRect.left + 10;
    }
    
    // Adjust vertical position
    if (rect.bottom > containerRect.bottom) {
      top = containerRect.bottom - rect.height - 10;
    }
    if (rect.top < containerRect.top) {
      top = containerRect.top + 10;
    }
    
    this.overlay.style.left = `${left}px`;
    this.overlay.style.top = `${top}px`;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
