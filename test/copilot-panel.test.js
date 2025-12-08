// Mock DOM environment for copilot panel testing
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.style = { cssText: '' };
    this.className = '';
    this.eventListeners = {};
    this.parentNode = null;
    this.id = '';
    this.value = '';
  }

  get classList() {
    const self = this;
    return {
      add(cls) { 
        const classes = self.className ? self.className.split(' ').filter(c => c) : [];
        if (!classes.includes(cls)) {
          classes.push(cls);
          self.className = classes.join(' ');
        }
      },
      remove(cls) { 
        const classes = self.className ? self.className.split(' ').filter(c => c) : [];
        const idx = classes.indexOf(cls);
        if (idx >= 0) {
          classes.splice(idx, 1);
          self.className = classes.join(' ');
        }
      },
      toggle(cls, force) { 
        const classes = self.className ? self.className.split(' ').filter(c => c) : [];
        const hasClass = classes.includes(cls);
        if (force === undefined) {
          if (hasClass) {
            this.remove(cls);
            return false;
          } else {
            this.add(cls);
            return true;
          }
        }
        if (force) this.add(cls);
        else this.remove(cls);
        return force;
      },
      contains(cls) { 
        const classes = self.className ? self.className.split(' ').filter(c => c) : [];
        return classes.includes(cls);
      }
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners[event.type] || [];
    handlers.forEach(h => h(event));
    return true;
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      if (this.id === id) return this;
      for (const child of this.children) {
        const found = child.querySelector?.(selector);
        if (found) return found;
      }
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      const classes = this.className ? this.className.split(' ').filter(c => c) : [];
      if (classes.includes(cls)) return this;
      for (const child of this.children) {
        const found = child.querySelector?.(selector);
        if (found) return found;
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    return [];
  }
}

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = value; }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

class MockDocument {
  constructor() {
    this.head = new MockElement('head');
    this.body = new MockElement('body');
    this.elements = new Map();
    this.eventListeners = {};
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  querySelector(selector) {
    if (this.elements.has(selector)) {
      return this.elements.get(selector);
    }
    if (selector === '#test-container') {
      const el = new MockElement('div');
      this.elements.set(selector, el);
      return el;
    }
    return null;
  }

  getElementById(id) {
    return this.elements.get('#' + id) || null;
  }

  querySelectorAll(selector) {
    const results = [];
    this.elements.forEach((el, key) => {
      if (key === selector || (selector.startsWith('#') && el.id === selector.slice(1))) {
        results.push(el);
      }
    });
    return results;
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners[event.type] || [];
    handlers.forEach(h => h(event));
    return true;
  }
}

// Set up mock DOM
globalThis.document = new MockDocument();
globalThis.localStorage = new MockLocalStorage();
globalThis.fetch = async () => {
  return { ok: false, json: async () => ({}) };
};

// Now import the CopilotPanel
const { CopilotPanel } = await import('../src/core/editor/copilot-panel.js');

describe('CopilotPanel', () => {
  let container;
  let panel;

  beforeEach(() => {
    container = new MockElement('div');
    container.id = 'test-container';
    globalThis.document.elements.set('#test-container', container);
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    if (panel) {
      panel.destroy();
    }
  });

  describe('initialization', () => {
    test('should initialize with a container element', () => {
      panel = new CopilotPanel(container);
      expect(panel.container).toBe(container);
      expect(panel.panelElement).not.toBeNull();
    });

    test('should initialize with a selector string', () => {
      panel = new CopilotPanel('#test-container');
      expect(panel.container).toBe(container);
    });

    test('should create panel elements', () => {
      panel = new CopilotPanel(container);
      expect(panel.panelElement).not.toBeNull();
      expect(panel.inputElement).toBeDefined();
      expect(panel.historyElement).toBeDefined();
    });

    test('should accept custom options', () => {
      const onApplyEdit = () => {};
      const getCurrentSource = () => 'test';
      panel = new CopilotPanel(container, {
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        onApplyEdit,
        getCurrentSource,
      });
      expect(panel.options.apiKey).toBe('test-key');
      expect(panel.options.model).toBe('gpt-4o-mini');
      expect(panel.options.onApplyEdit).toBe(onApplyEdit);
      expect(panel.options.getCurrentSource).toBe(getCurrentSource);
    });
  });

  describe('API key management', () => {
    test('should set API key programmatically', () => {
      panel = new CopilotPanel(container);
      panel.setApiKey('new-api-key');
      expect(panel.options.apiKey).toBe('new-api-key');
      expect(localStorage.getItem('meerkat_copilot_api_key')).toBe('new-api-key');
    });

    test('should load API key from local storage', () => {
      localStorage.setItem('meerkat_copilot_api_key', 'stored-key');
      panel = new CopilotPanel(container);
      panel.loadSettings();
      expect(panel.options.apiKey).toBe('stored-key');
    });

    test('should save model to local storage', () => {
      panel = new CopilotPanel(container);
      panel.options.model = 'gpt-4o-mini';
      localStorage.setItem('meerkat_copilot_model', 'gpt-4o-mini');
      panel.loadSettings();
      expect(panel.options.model).toBe('gpt-4o-mini');
    });
  });

  describe('message handling', () => {
    test('should add message to history', () => {
      panel = new CopilotPanel(container);
      panel.addMessage('user', 'Test message');
      // Check that welcome message is removed
      const welcome = panel.historyElement?.querySelector('.copilot-welcome');
      expect(welcome).toBeNull();
    });

    test('should remove loading message', () => {
      panel = new CopilotPanel(container);
      panel.addMessage('loading', 'Thinking...');
      panel.removeLoadingMessage();
      // The loading message should be removed
      expect(panel.isLoading).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      panel = new CopilotPanel(container);
      expect(panel.escapeHtml('<')).toBe('&lt;');
      expect(panel.escapeHtml('>')).toBe('&gt;');
      expect(panel.escapeHtml('&')).toBe('&amp;');
      expect(panel.escapeHtml('"')).toBe('&quot;');
      expect(panel.escapeHtml("'")).toBe('&#039;');
    });

    test('should escape multiple characters', () => {
      panel = new CopilotPanel(container);
      expect(panel.escapeHtml('<div class="test">')).toBe('&lt;div class=&quot;test&quot;&gt;');
    });
  });

  describe('cleanCodeResponse', () => {
    test('should remove markdown code blocks', () => {
      panel = new CopilotPanel(container);
      const input = '```mermaid\nsequenceDiagram\n```';
      const result = panel.cleanCodeResponse(input);
      expect(result).toBe('sequenceDiagram');
    });

    test('should handle code without markdown blocks', () => {
      panel = new CopilotPanel(container);
      const input = 'sequenceDiagram\nparticipant A';
      const result = panel.cleanCodeResponse(input);
      expect(result).toBe('sequenceDiagram\nparticipant A');
    });

    test('should remove meerkat code blocks', () => {
      panel = new CopilotPanel(container);
      const input = '```meerkat\nsequenceDiagram\n```';
      const result = panel.cleanCodeResponse(input);
      expect(result).toBe('sequenceDiagram');
    });
  });

  describe('destroy', () => {
    test('should clean up resources', () => {
      panel = new CopilotPanel(container);
      panel.destroy();
      
      expect(panel.panelElement).toBeNull();
      expect(panel.inputElement).toBeNull();
      expect(panel.historyElement).toBeNull();
    });
  });

  describe('step context management', () => {
    const mockMessage1 = {
      source: 'Client',
      target: 'Server',
      arrow: '->>',
      text: 'GET request',
      annotations: {
        method: 'GET',
        path: '/api/users',
        requestType: 'JSON',
        isAsync: false
      }
    };

    const mockMessage2 = {
      source: 'Server',
      target: 'Database',
      arrow: '->>',
      text: 'Query',
      annotations: {
        timeout: '100ms',
        queue: 'db-queue'
      }
    };

    const mockMessage3 = {
      source: 'Server',
      target: 'Client',
      arrow: '-->>',
      text: 'Response',
      annotations: {
        flows: ['happy_path', 'error_path']
      }
    };

    test('should add step to context', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(0, mockMessage1);
      
      expect(panel.selectedSteps.size).toBe(1);
      expect(panel.selectedSteps.has(0)).toBe(true);
    });

    test('should not duplicate steps', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(0, mockMessage1);
      panel.addStepContext(0, mockMessage1);
      
      expect(panel.selectedSteps.size).toBe(1);
    });

    test('should remove step from context', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(0, mockMessage1);
      panel.addStepContext(1, mockMessage2);
      panel.removeStepContext(0);
      
      expect(panel.selectedSteps.size).toBe(1);
      expect(panel.selectedSteps.has(0)).toBe(false);
      expect(panel.selectedSteps.has(1)).toBe(true);
    });

    test('should toggle step context - add when not present', () => {
      panel = new CopilotPanel(container);
      panel.toggleStepContext(0, mockMessage1, true);
      
      expect(panel.selectedSteps.has(0)).toBe(true);
    });

    test('should toggle step context - remove when present', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(0, mockMessage1);
      panel.toggleStepContext(0, mockMessage1, true);
      
      expect(panel.selectedSteps.has(0)).toBe(false);
    });

    test('should replace selection when not adding to selection', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(0, mockMessage1);
      panel.addStepContext(1, mockMessage2);
      panel.toggleStepContext(2, mockMessage3, false);
      
      expect(panel.selectedSteps.size).toBe(1);
      expect(panel.selectedSteps.has(2)).toBe(true);
    });

    test('should clear all step context', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(0, mockMessage1);
      panel.addStepContext(1, mockMessage2);
      panel.clearStepContext();
      
      expect(panel.selectedSteps.size).toBe(0);
    });

    test('should get selected steps sorted by index', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(2, mockMessage3);
      panel.addStepContext(0, mockMessage1);
      panel.addStepContext(1, mockMessage2);
      
      const sorted = panel.getSelectedSteps();
      expect(sorted.length).toBe(3);
      expect(sorted[0].stepIndex).toBe(0);
      expect(sorted[1].stepIndex).toBe(1);
      expect(sorted[2].stepIndex).toBe(2);
    });

    test('should format step context for prompt', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(0, mockMessage1);
      
      const formatted = panel.formatStepContextForPrompt();
      expect(formatted).toContain('Selected steps for context');
      expect(formatted).toContain('Step 1');
      expect(formatted).toContain('Client');
      expect(formatted).toContain('Server');
      expect(formatted).toContain('@path(GET /api/users)');
      expect(formatted).toContain('@type(JSON)');
      expect(formatted).toContain('@sync');
    });

    test('should format step context with timeout and queue', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(1, mockMessage2);
      
      const formatted = panel.formatStepContextForPrompt();
      expect(formatted).toContain('@timeout(100ms)');
      expect(formatted).toContain('@queue(db-queue)');
    });

    test('should format step context with multiple flows', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(2, mockMessage3);
      
      const formatted = panel.formatStepContextForPrompt();
      expect(formatted).toContain('@flow(happy_path)');
      expect(formatted).toContain('@flow(error_path)');
    });

    test('should return empty string when no steps selected', () => {
      panel = new CopilotPanel(container);
      
      const formatted = panel.formatStepContextForPrompt();
      expect(formatted).toBe('');
    });

    test('should format multiple steps in order', () => {
      panel = new CopilotPanel(container);
      panel.addStepContext(1, mockMessage2);
      panel.addStepContext(0, mockMessage1);
      
      const formatted = panel.formatStepContextForPrompt();
      const step1Pos = formatted.indexOf('Step 1');
      const step2Pos = formatted.indexOf('Step 2');
      expect(step1Pos).toBeLessThan(step2Pos);
    });
  });
});
