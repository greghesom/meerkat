/**
 * Syntax Editor Component for Meerkat sequence diagrams
 * Provides syntax highlighting, line numbers, and real-time preview
 */

import { Lexer, TokenType } from '../parser/lexer.js';

/**
 * Default configuration for the syntax editor
 */
const EDITOR_CONFIG = {
  debounceDelay: 300,       // Delay in ms before triggering preview update
  tabSize: 2,               // Number of spaces for tab
  fontSize: 13,             // Font size in px
  lineHeight: 1.5,          // Line height multiplier
  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
};

/**
 * Syntax highlighting token classes
 */
const TOKEN_CLASSES = {
  [TokenType.KEYWORD]: 'token-keyword',
  [TokenType.IDENTIFIER]: 'token-identifier',
  [TokenType.STRING]: 'token-string',
  [TokenType.ARROW]: 'token-arrow',
  [TokenType.COLON]: 'token-punctuation',
  [TokenType.AS]: 'token-keyword',
  [TokenType.ANNOTATION]: 'token-annotation',
  [TokenType.COMMENT]: 'token-comment',
  [TokenType.INIT_DIRECTIVE]: 'token-directive',
  [TokenType.FLOW_DIRECTIVE]: 'token-directive',
};

/**
 * SyntaxEditor class - provides a code editor with syntax highlighting
 */
export class SyntaxEditor {
  /**
   * Create a new SyntaxEditor
   * @param {HTMLElement|string} container - Container element or selector
   * @param {object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      debounceDelay: options.debounceDelay ?? EDITOR_CONFIG.debounceDelay,
      tabSize: options.tabSize ?? EDITOR_CONFIG.tabSize,
      fontSize: options.fontSize ?? EDITOR_CONFIG.fontSize,
      lineHeight: options.lineHeight ?? EDITOR_CONFIG.lineHeight,
      fontFamily: options.fontFamily ?? EDITOR_CONFIG.fontFamily,
      onChange: options.onChange || null,
      onError: options.onError || null,
    };

    this.editorElement = null;
    this.textareaElement = null;
    this.highlightElement = null;
    this.lineNumbersElement = null;
    this.debounceTimer = null;
    this.errorLines = new Set();

    this.init();
  }

  /**
   * Initialize the editor
   */
  init() {
    if (!this.container) return;

    this.addEditorStyles();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Render the editor UI
   */
  render() {
    // Clear existing content
    this.container.innerHTML = '';

    // Create editor wrapper
    this.editorElement = document.createElement('div');
    this.editorElement.className = 'syntax-editor';

    // Create line numbers container
    this.lineNumbersElement = document.createElement('div');
    this.lineNumbersElement.className = 'syntax-editor-line-numbers';
    this.editorElement.appendChild(this.lineNumbersElement);

    // Create code container (holds both highlight layer and textarea)
    const codeContainer = document.createElement('div');
    codeContainer.className = 'syntax-editor-code-container';

    // Create highlight layer (shows syntax highlighted code)
    this.highlightElement = document.createElement('pre');
    this.highlightElement.className = 'syntax-editor-highlight';
    this.highlightElement.setAttribute('aria-hidden', 'true');
    codeContainer.appendChild(this.highlightElement);

    // Create textarea (invisible, handles input)
    this.textareaElement = document.createElement('textarea');
    this.textareaElement.className = 'syntax-editor-textarea';
    this.textareaElement.spellcheck = false;
    this.textareaElement.autocomplete = 'off';
    this.textareaElement.autocorrect = 'off';
    this.textareaElement.autocapitalize = 'off';
    this.textareaElement.setAttribute('data-gramm', 'false'); // Disable Grammarly
    codeContainer.appendChild(this.textareaElement);

    this.editorElement.appendChild(codeContainer);
    this.container.appendChild(this.editorElement);

    // Initial update
    this.updateLineNumbers();
    this.updateHighlight();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this.textareaElement) return;

    // Handle input events
    this.textareaElement.addEventListener('input', () => {
      this.updateLineNumbers();
      this.updateHighlight();
      this.scheduleOnChange();
    });

    // Sync scroll between textarea and highlight layer
    this.textareaElement.addEventListener('scroll', () => {
      this.syncScroll();
    });

    // Handle tab key for indentation
    this.textareaElement.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.insertTab();
      }
    });
  }

  /**
   * Sync scroll position between textarea and highlight/line numbers
   */
  syncScroll() {
    if (this.highlightElement && this.textareaElement) {
      this.highlightElement.scrollTop = this.textareaElement.scrollTop;
      this.highlightElement.scrollLeft = this.textareaElement.scrollLeft;
    }
    if (this.lineNumbersElement && this.textareaElement) {
      this.lineNumbersElement.scrollTop = this.textareaElement.scrollTop;
    }
  }

  /**
   * Insert tab at cursor position
   */
  insertTab() {
    const textarea = this.textareaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tab = ' '.repeat(this.options.tabSize);

    textarea.value =
      textarea.value.substring(0, start) +
      tab +
      textarea.value.substring(end);

    textarea.selectionStart = textarea.selectionEnd = start + tab.length;
    
    // Trigger input event to update highlighting
    textarea.dispatchEvent(new Event('input'));
  }

  /**
   * Update line numbers display
   */
  updateLineNumbers() {
    if (!this.lineNumbersElement || !this.textareaElement) return;

    const lines = this.textareaElement.value.split('\n');
    const lineCount = lines.length;

    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      const errorClass = this.errorLines.has(i) ? ' line-error' : '';
      html += `<div class="line-number${errorClass}">${i}</div>`;
    }

    this.lineNumbersElement.innerHTML = html;
  }

  /**
   * Update syntax highlighting
   */
  updateHighlight() {
    if (!this.highlightElement || !this.textareaElement) return;

    const source = this.textareaElement.value;
    const highlighted = this.highlightSyntax(source);
    
    // Add a trailing newline to match textarea behavior
    this.highlightElement.innerHTML = highlighted + '\n';
  }

  /**
   * Highlight syntax in the source code
   * @param {string} source - Source code to highlight
   * @returns {string} - HTML with syntax highlighting
   */
  highlightSyntax(source) {
    if (!source) return '';

    try {
      // Use the lexer to tokenize the source
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      // Build highlighted HTML by walking through source with token positions
      let result = '';
      let lastPos = 0;

      // We need to track positions in the source
      // Re-tokenize while tracking positions
      const tokenPositions = this.tokenizeWithPositions(source);

      for (const tokenInfo of tokenPositions) {
        // Add any text before this token as plain text
        if (tokenInfo.start > lastPos) {
          const beforeText = source.slice(lastPos, tokenInfo.start);
          result += this.escapeHtml(beforeText);
        }

        // Add the token with highlighting
        const tokenClass = TOKEN_CLASSES[tokenInfo.type] || '';
        const tokenText = this.escapeHtml(tokenInfo.text);
        
        if (tokenClass) {
          result += `<span class="${tokenClass}">${tokenText}</span>`;
        } else {
          result += tokenText;
        }

        lastPos = tokenInfo.end;
      }

      // Add any remaining text
      if (lastPos < source.length) {
        result += this.escapeHtml(source.slice(lastPos));
      }

      return result;
    } catch {
      // If tokenization fails, return escaped plain text
      return this.escapeHtml(source);
    }
  }

  /**
   * Tokenize source while tracking positions
   * @param {string} source - Source to tokenize
   * @returns {Array} - Array of tokens with position info
   */
  tokenizeWithPositions(source) {
    const tokens = [];
    let position = 0;

    while (position < source.length) {
      // Skip whitespace (except newlines) - don't create tokens
      if (source[position] === ' ' || source[position] === '\t' || source[position] === '\r') {
        position++;
        continue;
      }

      // Newlines
      if (source[position] === '\n') {
        tokens.push({
          type: TokenType.NEWLINE,
          text: '\n',
          start: position,
          end: position + 1,
        });
        position++;
        continue;
      }

      // Comments (starting with %%)
      if (source.slice(position, position + 2) === '%%') {
        const start = position;
        position += 2;

        // Check for flow directive
        if (source.slice(position, position + 5) === 'flow ') {
          // Read until end of line
          while (position < source.length && source[position] !== '\n') {
            position++;
          }
          tokens.push({
            type: TokenType.FLOW_DIRECTIVE,
            text: source.slice(start, position),
            start,
            end: position,
          });
          continue;
        }

        // Check for init directive
        if (source[position] === '{') {
          const endMarker = '}%%';
          const endIdx = source.indexOf(endMarker, position);
          if (endIdx !== -1) {
            position = endIdx + 3;
            tokens.push({
              type: TokenType.INIT_DIRECTIVE,
              text: source.slice(start, position),
              start,
              end: position,
            });
            continue;
          }
        }

        // Regular comment - read until end of line
        while (position < source.length && source[position] !== '\n') {
          position++;
        }
        tokens.push({
          type: TokenType.COMMENT,
          text: source.slice(start, position),
          start,
          end: position,
        });
        continue;
      }

      // Annotations (starting with @)
      if (source[position] === '@') {
        const start = position;
        position++;

        // Read annotation name
        while (position < source.length && this.isAlphaNumeric(source[position])) {
          position++;
        }

        // Read annotation value if present
        if (source[position] === '(') {
          let depth = 1;
          position++;
          while (depth > 0 && position < source.length) {
            if (source[position] === '(') depth++;
            if (source[position] === ')') depth--;
            position++;
          }
        } else if (source[position] === '{') {
          let depth = 1;
          position++;
          while (depth > 0 && position < source.length) {
            if (source[position] === '{') depth++;
            if (source[position] === '}') depth--;
            position++;
          }
        }

        tokens.push({
          type: TokenType.ANNOTATION,
          text: source.slice(start, position),
          start,
          end: position,
        });
        continue;
      }

      // Arrows
      const arrowPatterns = ['->>', '-->>', '->', '-->'];
      let matched = false;
      for (const arrow of arrowPatterns) {
        if (source.slice(position, position + arrow.length) === arrow) {
          tokens.push({
            type: TokenType.ARROW,
            text: arrow,
            start: position,
            end: position + arrow.length,
          });
          position += arrow.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Colon
      if (source[position] === ':') {
        tokens.push({
          type: TokenType.COLON,
          text: ':',
          start: position,
          end: position + 1,
        });
        position++;
        continue;
      }

      // Quoted strings
      if (source[position] === '"' || source[position] === "'") {
        const quote = source[position];
        const start = position;
        position++;
        while (position < source.length && source[position] !== quote) {
          position++;
        }
        if (position < source.length) position++; // Skip closing quote
        tokens.push({
          type: TokenType.STRING,
          text: source.slice(start, position),
          start,
          end: position,
        });
        continue;
      }

      // Identifiers and keywords
      if (this.isAlpha(source[position]) || source[position] === '_') {
        const start = position;
        while (position < source.length && this.isAlphaNumeric(source[position])) {
          position++;
        }
        const text = source.slice(start, position);
        const keywords = ['sequenceDiagram', 'participant', 'actor', 'Note', 'over', 'right', 'left', 'of', 'title', 'description', 'as'];
        const type = keywords.includes(text) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        tokens.push({
          type,
          text,
          start,
          end: position,
        });
        continue;
      }

      // Unknown character - skip
      position++;
    }

    return tokens;
  }

  /**
   * Check if character is alphabetic
   */
  isAlpha(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  }

  /**
   * Check if character is alphanumeric
   */
  isAlphaNumeric(ch) {
    return this.isAlpha(ch) || (ch >= '0' && ch <= '9') || ch === '_';
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Schedule onChange callback with debouncing
   */
  scheduleOnChange() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.triggerChange();
    }, this.options.debounceDelay);
  }

  /**
   * Trigger the onChange callback
   */
  triggerChange() {
    if (this.options.onChange) {
      this.options.onChange(this.getValue());
    }
  }

  /**
   * Set error lines (for syntax error highlighting)
   * @param {number[]} lines - Array of 1-based line numbers with errors
   */
  setErrorLines(lines) {
    this.errorLines = new Set(lines);
    this.updateLineNumbers();
  }

  /**
   * Clear error lines
   */
  clearErrors() {
    this.errorLines.clear();
    this.updateLineNumbers();
  }

  /**
   * Get the current value
   * @returns {string} - Current editor content
   */
  getValue() {
    return this.textareaElement ? this.textareaElement.value : '';
  }

  /**
   * Set the editor value
   * @param {string} value - Value to set
   */
  setValue(value) {
    if (this.textareaElement) {
      this.textareaElement.value = value;
      this.updateLineNumbers();
      this.updateHighlight();
    }
  }

  /**
   * Focus the editor
   */
  focus() {
    if (this.textareaElement) {
      this.textareaElement.focus();
    }
  }

  /**
   * Add editor styles to the document
   */
  addEditorStyles() {
    const styleId = 'syntax-editor-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .syntax-editor {
        display: flex;
        width: 100%;
        height: 100%;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #1e1e1e;
        overflow: hidden;
        font-family: ${this.options.fontFamily};
        font-size: ${this.options.fontSize}px;
        line-height: ${this.options.lineHeight};
      }

      .syntax-editor-line-numbers {
        flex-shrink: 0;
        padding: 12px 0;
        background: #252526;
        color: #858585;
        text-align: right;
        user-select: none;
        overflow: hidden;
        border-right: 1px solid #3c3c3c;
      }

      .syntax-editor-line-numbers .line-number {
        padding: 0 12px 0 8px;
        min-width: 40px;
      }

      .syntax-editor-line-numbers .line-number.line-error {
        background: rgba(255, 0, 0, 0.2);
        color: #f48771;
      }

      .syntax-editor-code-container {
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      .syntax-editor-highlight,
      .syntax-editor-textarea {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        padding: 12px;
        margin: 0;
        border: none;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        white-space: pre;
        overflow: auto;
        box-sizing: border-box;
      }

      .syntax-editor-highlight {
        pointer-events: none;
        color: #d4d4d4;
        background: transparent;
      }

      .syntax-editor-textarea {
        background: transparent;
        color: transparent;
        caret-color: #fff;
        resize: none;
        outline: none;
        z-index: 1;
      }

      /* Syntax highlighting colors (VS Code dark theme inspired) */
      .syntax-editor-highlight .token-keyword {
        color: #569cd6;
      }

      .syntax-editor-highlight .token-identifier {
        color: #9cdcfe;
      }

      .syntax-editor-highlight .token-string {
        color: #ce9178;
      }

      .syntax-editor-highlight .token-arrow {
        color: #d4d4d4;
        font-weight: bold;
      }

      .syntax-editor-highlight .token-punctuation {
        color: #d4d4d4;
      }

      .syntax-editor-highlight .token-annotation {
        color: #4ec9b0;
      }

      .syntax-editor-highlight .token-comment {
        color: #6a9955;
        font-style: italic;
      }

      .syntax-editor-highlight .token-directive {
        color: #c586c0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destroy the editor and clean up
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.editorElement = null;
    this.textareaElement = null;
    this.highlightElement = null;
    this.lineNumbersElement = null;
  }
}
