import { Lexer } from './core/parser/lexer.js';
import { Parser } from './core/parser/parser.js';
import { SVGRenderer } from './core/renderer/svg-renderer.js';

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
      ...options,
    };

    this.renderer = null;
    this.ast = null;

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
  }

  /**
   * Render diagram from source
   */
  render(source) {
    try {
      // Parse source
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      const parser = new Parser(tokens);
      this.ast = parser.parse();

      // Render SVG
      this.renderer.render(this.ast, {});

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
   * Destroy the visualizer
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export classes for module usage
export { Lexer } from './core/parser/lexer.js';
export { Parser } from './core/parser/parser.js';
export { SVGRenderer } from './core/renderer/svg-renderer.js';

// Expose globally for script tag usage
if (typeof window !== 'undefined') {
  window.SequenceVisualizer = SequenceVisualizer;
}
