import { TokenType } from '../src/core/parser/lexer.js';

// Mock DOM environment for syntax editor testing
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(cls) { this.classes.add(cls); }
  remove(cls) { this.classes.delete(cls); }
  toggle(cls, force) { 
    if (force === undefined) {
      if (this.classes.has(cls)) {
        this.classes.delete(cls);
        return false;
      } else {
        this.classes.add(cls);
        return true;
      }
    }
    if (force) this.classes.add(cls);
    else this.classes.delete(cls);
    return force;
  }
  contains(cls) { return this.classes.has(cls); }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.className = '';
    this.value = '';
    this.spellcheck = true;
    this.autocomplete = '';
    this.autocorrect = '';
    this.autocapitalize = '';
    this.classList = new MockClassList();
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.eventListeners = {};
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners[event.type] || [];
    handlers.forEach(h => h(event));
    return true;
  }

  querySelectorAll(selector) {
    // Simple mock for line-number queries
    if (selector === '.line-number') {
      const lines = this.innerHTML.match(/<div class="line-number[^"]*">\d+<\/div>/g) || [];
      return lines.map((line, i) => {
        const el = new MockElement('div');
        const match = line.match(/>(\d+)</);
        el.textContent = match ? match[1] : '';
        el.classList = new MockClassList();
        if (line.includes('line-error')) {
          el.classList.add('line-error');
        }
        return el;
      });
    }
    return [];
  }

  focus() {
    MockDocument.activeElement = this;
  }
}

class MockDocument {
  static activeElement = null;

  constructor() {
    this.head = new MockElement('head');
    this.body = new MockElement('body');
    this.elements = new Map();
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  createElementNS(ns, tagName) {
    return new MockElement(tagName);
  }

  querySelector(selector) {
    if (selector === '#test-container') {
      if (!this.elements.has(selector)) {
        const el = new MockElement('div');
        this.elements.set(selector, el);
      }
      return this.elements.get(selector);
    }
    return new MockElement('div');
  }

  getElementById(id) {
    return this.elements.get('#' + id) || null;
  }
}

// Set up mock DOM
globalThis.document = new MockDocument();

// Now import the SyntaxEditor
const { SyntaxEditor } = await import('../src/core/editor/syntax-editor.js');

describe('SyntaxEditor', () => {
  let container;
  let editor;

  beforeEach(() => {
    container = new MockElement('div');
    container.id = 'test-container';
    globalThis.document.elements.set('#test-container', container);
    MockDocument.activeElement = null;
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  describe('initialization', () => {
    test('should initialize with a container element', () => {
      editor = new SyntaxEditor(container);
      expect(editor.container).toBe(container);
      expect(editor.editorElement).not.toBeNull();
    });

    test('should initialize with a selector string', () => {
      editor = new SyntaxEditor('#test-container');
      expect(editor.container).toBe(container);
    });

    test('should create editor elements', () => {
      editor = new SyntaxEditor(container);
      expect(editor.textareaElement).not.toBeNull();
      expect(editor.highlightElement).not.toBeNull();
      expect(editor.lineNumbersElement).not.toBeNull();
    });

    test('should accept custom options', () => {
      const onChange = () => {};
      editor = new SyntaxEditor(container, {
        debounceDelay: 500,
        tabSize: 4,
        fontSize: 16,
        onChange,
      });
      expect(editor.options.debounceDelay).toBe(500);
      expect(editor.options.tabSize).toBe(4);
      expect(editor.options.fontSize).toBe(16);
      expect(editor.options.onChange).toBe(onChange);
    });
  });

  describe('getValue and setValue', () => {
    test('should get the current value', () => {
      editor = new SyntaxEditor(container);
      editor.textareaElement.value = 'test content';
      expect(editor.getValue()).toBe('test content');
    });

    test('should set the value', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('new content');
      expect(editor.textareaElement.value).toBe('new content');
    });

    test('should update highlighting when setting value', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('sequenceDiagram');
      expect(editor.highlightElement.innerHTML).toContain('sequenceDiagram');
    });
  });

  describe('syntax highlighting', () => {
    test('should highlight keywords', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('sequenceDiagram');
      expect(editor.highlightElement.innerHTML).toContain('token-keyword');
    });

    test('should highlight identifiers', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('participant Alice');
      expect(editor.highlightElement.innerHTML).toContain('token-keyword');
      expect(editor.highlightElement.innerHTML).toContain('token-identifier');
    });

    test('should highlight annotations', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('@path(GET /api/users)');
      expect(editor.highlightElement.innerHTML).toContain('token-annotation');
    });

    test('should highlight comments', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('%% This is a comment');
      expect(editor.highlightElement.innerHTML).toContain('token-comment');
    });

    test('should highlight flow directives', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('%%flow happy_path "Happy Path"');
      expect(editor.highlightElement.innerHTML).toContain('token-directive');
    });

    test('should highlight strings', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('"quoted string"');
      expect(editor.highlightElement.innerHTML).toContain('token-string');
    });

    test('should highlight arrows', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('->>');
      expect(editor.highlightElement.innerHTML).toContain('token-arrow');
    });

    test('should escape HTML characters', () => {
      editor = new SyntaxEditor(container);
      editor.setValue('<script>alert("xss")</script>');
      expect(editor.highlightElement.innerHTML).toContain('&lt;');
      expect(editor.highlightElement.innerHTML).toContain('&gt;');
      expect(editor.highlightElement.innerHTML).not.toContain('<script>');
    });
  });

  describe('error highlighting', () => {
    test('should set error lines', () => {
      editor = new SyntaxEditor(container);
      editor.setErrorLines([2]);
      expect(editor.errorLines.has(2)).toBe(true);
    });

    test('should clear error lines', () => {
      editor = new SyntaxEditor(container);
      editor.setErrorLines([1, 2]);
      editor.clearErrors();
      expect(editor.errorLines.size).toBe(0);
    });

    test('should handle multiple error lines', () => {
      editor = new SyntaxEditor(container);
      editor.setErrorLines([1, 3]);
      expect(editor.errorLines.has(1)).toBe(true);
      expect(editor.errorLines.has(2)).toBe(false);
      expect(editor.errorLines.has(3)).toBe(true);
    });
  });

  describe('destroy', () => {
    test('should clean up resources', () => {
      editor = new SyntaxEditor(container);
      editor.destroy();
      
      expect(editor.editorElement).toBeNull();
      expect(editor.textareaElement).toBeNull();
      expect(editor.highlightElement).toBeNull();
      expect(editor.lineNumbersElement).toBeNull();
    });

    test('should clear debounce timer on destroy', () => {
      const onChange = () => {};
      editor = new SyntaxEditor(container, {
        debounceDelay: 100,
        onChange,
      });
      
      // Schedule a change
      editor.scheduleOnChange();
      
      // Destroy immediately
      editor.destroy();
      
      // The timer should be cleared
      expect(editor.debounceTimer).toBeNull();
    });
  });

  describe('tokenizeWithPositions', () => {
    test('should tokenize keywords with positions', () => {
      editor = new SyntaxEditor(container);
      const tokens = editor.tokenizeWithPositions('sequenceDiagram');
      
      expect(tokens.length).toBe(1);
      expect(tokens[0].type).toBe(TokenType.KEYWORD);
      expect(tokens[0].text).toBe('sequenceDiagram');
      expect(tokens[0].start).toBe(0);
      expect(tokens[0].end).toBe(15);
    });

    test('should tokenize arrows correctly', () => {
      editor = new SyntaxEditor(container);
      const tokens = editor.tokenizeWithPositions('A->>B');
      
      const arrowToken = tokens.find(t => t.type === TokenType.ARROW);
      expect(arrowToken).toBeDefined();
      expect(arrowToken.text).toBe('->>');
    });

    test('should tokenize annotations with values', () => {
      editor = new SyntaxEditor(container);
      const tokens = editor.tokenizeWithPositions('@path(GET /users)');
      
      expect(tokens.length).toBe(1);
      expect(tokens[0].type).toBe(TokenType.ANNOTATION);
      expect(tokens[0].text).toBe('@path(GET /users)');
    });

    test('should handle multiline source', () => {
      editor = new SyntaxEditor(container);
      const source = 'sequenceDiagram\nparticipant Alice';
      const tokens = editor.tokenizeWithPositions(source);
      
      const keywords = tokens.filter(t => t.type === TokenType.KEYWORD);
      expect(keywords.length).toBe(2);
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      editor = new SyntaxEditor(container);
      expect(editor.escapeHtml('<')).toBe('&lt;');
      expect(editor.escapeHtml('>')).toBe('&gt;');
      expect(editor.escapeHtml('&')).toBe('&amp;');
      expect(editor.escapeHtml('"')).toBe('&quot;');
      expect(editor.escapeHtml("'")).toBe('&#039;');
    });

    test('should escape multiple characters', () => {
      editor = new SyntaxEditor(container);
      expect(editor.escapeHtml('<div class="test">')).toBe('&lt;div class=&quot;test&quot;&gt;');
    });
  });
});
