/**
 * Split Pane Component for resizable split views
 * Provides a draggable divider between two panes
 */

/**
 * Default configuration for the split pane
 */
const SPLIT_PANE_CONFIG = {
  minPaneSize: 200,        // Minimum size for each pane in pixels
  initialSplit: 0.4,       // Initial split ratio (0-1)
  dividerSize: 8,          // Width of the divider in pixels
};

/**
 * SplitPane class - provides a resizable split view
 */
export class SplitPane {
  /**
   * Create a new SplitPane
   * @param {HTMLElement|string} container - Container element or selector
   * @param {object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      minPaneSize: options.minPaneSize ?? SPLIT_PANE_CONFIG.minPaneSize,
      initialSplit: options.initialSplit ?? SPLIT_PANE_CONFIG.initialSplit,
      dividerSize: options.dividerSize ?? SPLIT_PANE_CONFIG.dividerSize,
      leftContent: options.leftContent || null,
      rightContent: options.rightContent || null,
      onResize: options.onResize || null,
    };

    this.splitRatio = this.options.initialSplit;
    this.isDragging = false;
    this.wrapperElement = null;
    this.leftPane = null;
    this.rightPane = null;
    this.divider = null;

    this.init();
  }

  /**
   * Initialize the split pane
   */
  init() {
    if (!this.container) return;

    this.addSplitPaneStyles();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Render the split pane UI
   */
  render() {
    // Clear existing content
    this.container.innerHTML = '';

    // Create wrapper
    this.wrapperElement = document.createElement('div');
    this.wrapperElement.className = 'split-pane';

    // Create left pane
    this.leftPane = document.createElement('div');
    this.leftPane.className = 'split-pane-left';
    if (this.options.leftContent) {
      this.leftPane.appendChild(this.options.leftContent);
    }
    this.wrapperElement.appendChild(this.leftPane);

    // Create divider
    this.divider = document.createElement('div');
    this.divider.className = 'split-pane-divider';
    this.wrapperElement.appendChild(this.divider);

    // Create right pane
    this.rightPane = document.createElement('div');
    this.rightPane.className = 'split-pane-right';
    if (this.options.rightContent) {
      this.rightPane.appendChild(this.options.rightContent);
    }
    this.wrapperElement.appendChild(this.rightPane);

    this.container.appendChild(this.wrapperElement);

    // Apply initial split
    this.updateSplit();
  }

  /**
   * Set up event listeners for dragging
   */
  setupEventListeners() {
    if (!this.divider) return;

    this.divider.addEventListener('mousedown', (e) => {
      this.startDragging(e);
    });

    // Use document for mousemove and mouseup to handle dragging outside container
    document.addEventListener('mousemove', (e) => {
      this.onDrag(e);
    });

    document.addEventListener('mouseup', () => {
      this.stopDragging();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.updateSplit();
    });
  }

  /**
   * Start dragging the divider
   * @param {MouseEvent} e - Mouse event
   */
  startDragging(e) {
    this.isDragging = true;
    this.wrapperElement.classList.add('dragging');
    e.preventDefault();
  }

  /**
   * Handle drag movement
   * @param {MouseEvent} e - Mouse event
   */
  onDrag(e) {
    if (!this.isDragging) return;

    const containerRect = this.wrapperElement.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    // Calculate new split ratio
    let newRatio = mouseX / containerWidth;

    // Enforce minimum pane sizes
    const minRatio = this.options.minPaneSize / containerWidth;
    const maxRatio = 1 - minRatio;
    newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));

    this.splitRatio = newRatio;
    this.updateSplit();

    if (this.options.onResize) {
      this.options.onResize(this.splitRatio);
    }
  }

  /**
   * Stop dragging
   */
  stopDragging() {
    this.isDragging = false;
    if (this.wrapperElement) {
      this.wrapperElement.classList.remove('dragging');
    }
  }

  /**
   * Update pane sizes based on split ratio
   */
  updateSplit() {
    if (!this.leftPane || !this.rightPane) return;

    const dividerWidth = this.options.dividerSize;
    const leftWidth = `calc(${this.splitRatio * 100}% - ${dividerWidth / 2}px)`;
    const rightWidth = `calc(${(1 - this.splitRatio) * 100}% - ${dividerWidth / 2}px)`;

    this.leftPane.style.width = leftWidth;
    this.rightPane.style.width = rightWidth;
  }

  /**
   * Get the left pane element
   * @returns {HTMLElement} - Left pane element
   */
  getLeftPane() {
    return this.leftPane;
  }

  /**
   * Get the right pane element
   * @returns {HTMLElement} - Right pane element
   */
  getRightPane() {
    return this.rightPane;
  }

  /**
   * Set the split ratio
   * @param {number} ratio - Split ratio (0-1)
   */
  setSplit(ratio) {
    this.splitRatio = Math.max(0.1, Math.min(0.9, ratio));
    this.updateSplit();
  }

  /**
   * Add split pane styles to the document
   */
  addSplitPaneStyles() {
    const styleId = 'split-pane-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .split-pane {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .split-pane-left,
      .split-pane-right {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .split-pane-divider {
        width: ${this.options.dividerSize}px;
        background: #e0e0e0;
        cursor: col-resize;
        flex-shrink: 0;
        transition: background 0.15s ease;
        position: relative;
      }

      .split-pane-divider:hover,
      .split-pane.dragging .split-pane-divider {
        background: #3b82f6;
      }

      .split-pane-divider::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 4px;
        height: 40px;
        background: repeating-linear-gradient(
          to bottom,
          #888 0px,
          #888 2px,
          transparent 2px,
          transparent 6px
        );
        border-radius: 2px;
      }

      .split-pane.dragging {
        cursor: col-resize;
        user-select: none;
      }

      .split-pane.dragging .split-pane-left,
      .split-pane.dragging .split-pane-right {
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destroy the split pane and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.wrapperElement = null;
    this.leftPane = null;
    this.rightPane = null;
    this.divider = null;
  }
}
