import { Lexer } from './core/parser/lexer.js';
import { Parser } from './core/parser/parser.js';
import { SVGRenderer, StepState } from './core/renderer/svg-renderer.js';
import { TimelineSlider } from './core/timeline/timeline-slider.js';
import { StepDetailsPanel } from './core/timeline/step-details-panel.js';

/**
 * Main Sequence Visualizer class
 */
export class SequenceVisualizer {
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      theme: 'light',
      enableTimeline: false, // Timeline slider is disabled by default
      timelineContainer: null, // Separate container for timeline
      ...options,
    };

    this.renderer = null;
    this.ast = null;
    this.timelineSlider = null;
    this.currentStep = null;

    this.init();
  }

  /**
   * Initialize the visualizer
   */
  init() {
    // Initialize renderer
    this.renderer = new SVGRenderer(this.container, {
      theme: this.options.theme,
    });

    // Initialize timeline slider if enabled and container is provided
    if (this.options.enableTimeline && this.options.timelineContainer) {
      this.timelineSlider = new TimelineSlider(this.options.timelineContainer, {
        onChange: (step, total) => this.onTimelineChange(step, total),
      });
    }
  }

  /**
   * Handle timeline slider changes
   * @param {number} step - Current step (0 = start, n = show up to step n)
   * @param {number} total - Total number of steps
   */
  onTimelineChange(step, total) {
    this.currentStep = step === total ? null : step; // null means show all
    if (this.ast) {
      this.renderer.render(this.ast, { 
        currentStep: this.currentStep,
        activeFlow: this.activeFlow,
      });
    }
  }

  /**
   * Render diagram from source
   * @param {string} source - The diagram source
   * @param {object} state - Optional state for rendering (activeFlow, currentStep)
   */
  render(source, state = {}) {
    try {
      // Parse source
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      const parser = new Parser(tokens);
      this.ast = parser.parse();

      // Store activeFlow for timeline changes
      this.activeFlow = state.activeFlow || null;

      // Render SVG
      this.renderer.render(this.ast, {
        activeFlow: state.activeFlow,
        currentStep: state.currentStep ?? this.currentStep,
      });

      // Initialize timeline slider with the number of messages
      if (this.timelineSlider) {
        this.timelineSlider.init(this.ast.messages.length);
      }

      return { success: true, ast: this.ast };
    } catch (error) {
      console.error('Parse error:', error);
      return { success: false, error };
    }
  }

  /**
   * Get the current AST
   */
  getAST() {
    return this.ast;
  }

  /**
   * Get the timeline slider instance
   * @returns {TimelineSlider|null}
   */
  getTimelineSlider() {
    return this.timelineSlider;
  }

  /**
   * Go to a specific step on the timeline
   * @param {number} step - Step number (0 = start, n = show up to step n)
   */
  goToStep(step) {
    if (this.timelineSlider) {
      this.timelineSlider.goToStep(step);
    }
  }

  /**
   * Destroy the visualizer
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    if (this.timelineSlider) {
      this.timelineSlider.destroy();
    }
  }
}

// Export classes for module usage
export { Lexer } from './core/parser/lexer.js';
export { Parser } from './core/parser/parser.js';
export { SVGRenderer, StepState } from './core/renderer/svg-renderer.js';
export { TimelineSlider } from './core/timeline/timeline-slider.js';
export { StepDetailsPanel } from './core/timeline/step-details-panel.js';

// Expose globally for script tag usage
if (typeof window !== 'undefined') {
  window.SequenceVisualizer = SequenceVisualizer;
  window.TimelineSlider = TimelineSlider;
  window.StepDetailsPanel = StepDetailsPanel;
}
