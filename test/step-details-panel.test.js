import { Lexer } from '../src/core/parser/lexer.js';
import { Parser } from '../src/core/parser/parser.js';

// Mock DOM environment for testing
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.style = { cssText: '' };
    this.eventListeners = new Map();
    this.className = '';
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
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners.get(event.type) || [];
    handlers.forEach(h => h(event));
  }
}

class MockDocument {
  constructor() {
    this.head = new MockElement('head');
    this._styleIds = new Set();
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  createElementNS(ns, tagName) {
    return new MockElement(tagName);
  }

  querySelector(selector) {
    return new MockElement('div');
  }

  getElementById(id) {
    if (this._styleIds.has(id)) {
      return new MockElement('style');
    }
    return null;
  }
}

// Set up mock DOM
globalThis.document = new MockDocument();

// Now we can import the modules
const { StepDetailsPanel } = await import('../src/core/timeline/step-details-panel.js');

describe('StepDetailsPanel', () => {
  function parseSource(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  describe('initialization', () => {
    test('should initialize with container', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      expect(panel.container).toBe(container);
      expect(panel.panelElement).toBeNull();
      expect(panel.currentMessage).toBeNull();
    });

    test('should render placeholder after init', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      
      expect(panel.panelElement).not.toBeNull();
      expect(panel.ast).toBe(ast);
    });

    test('should accept string selector as container', () => {
      const panel = new StepDetailsPanel('#step-details-container');
      expect(panel.container).toBeInstanceOf(MockElement);
    });
  });

  describe('updateStep', () => {
    test('should show placeholder when step is null', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      panel.updateStep(null);
      
      expect(panel.currentMessage).toBeNull();
    });

    test('should show placeholder when step is 0', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      panel.updateStep(0);
      
      expect(panel.currentMessage).toBeNull();
    });

    test('should show message details when step is 1', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.currentMessage).not.toBeNull();
      expect(panel.currentMessage.source).toBe('Client');
      expect(panel.currentMessage.target).toBe('API');
      expect(panel.currentMessage.text).toBe('Request');
    });

    test('should update to different step', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: First
      API->>DB: Second
      DB-->>API: Third`);
      panel.init(ast);
      
      panel.updateStep(1);
      expect(panel.currentMessage.text).toBe('First');
      
      panel.updateStep(2);
      expect(panel.currentMessage.text).toBe('Second');
      
      panel.updateStep(3);
      expect(panel.currentMessage.text).toBe('Third');
    });
  });

  describe('message details rendering', () => {
    test('should display source and target systems', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Client');
      expect(panel.panelElement.innerHTML).toContain('API');
    });

    test('should display message text', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Get user data`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Get user data');
    });

    test('should display API path and method', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Get users @path(GET /api/users)`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('GET');
      expect(panel.panelElement.innerHTML).toContain('/api/users');
    });

    test('should display protocol type', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request @type(JSON)`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('JSON');
    });

    test('should display async status', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request @async`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Asynchronous');
    });

    test('should display sync status', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request @sync`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Synchronous');
    });

    test('should display timeout value', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request @timeout(30s)`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('30s');
      expect(panel.panelElement.innerHTML).toContain('Timeout');
    });

    test('should display queue value', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request @queue(user-events)`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('user-events');
      expect(panel.panelElement.innerHTML).toContain('Queue');
    });

    test('should display request payload hint', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Create user @request{name: string, email: string}`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Request');
      expect(panel.panelElement.innerHTML).toContain('name: string, email: string');
    });

    test('should display response payload hint', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      API-->>Client: User created @response{id: uuid, created_at: timestamp}`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Response');
      expect(panel.panelElement.innerHTML).toContain('id: uuid, created_at: timestamp');
    });

    test('should display flows that include the step', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      %%flow happy_path "Happy Path" #22C55E
      Client->>API: Request @flow(happy_path)`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Happy Path');
      expect(panel.panelElement.innerHTML).toContain('Included in Flows');
    });

    test('should display multiple flows for shared messages', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      %%flow happy_path "Happy Path" #22C55E
      %%flow error_flow "Error Flow" #EF4444
      Client->>API: Request @flow(happy_path, error_flow)`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.panelElement.innerHTML).toContain('Happy Path');
      expect(panel.panelElement.innerHTML).toContain('Error Flow');
    });
  });

  describe('getCurrentMessage', () => {
    test('should return current message when step is selected', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      panel.updateStep(1);
      
      expect(panel.getCurrentMessage()).not.toBeNull();
      expect(panel.getCurrentMessage().text).toBe('Request');
    });

    test('should return null when no step is selected', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      
      expect(panel.getCurrentMessage()).toBeNull();
    });
  });

  describe('destroy', () => {
    test('should clean up resources', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request`);
      panel.init(ast);
      panel.updateStep(1);
      
      panel.destroy();
      
      expect(panel.panelElement).toBeNull();
      expect(panel.currentMessage).toBeNull();
      expect(panel.ast).toBeNull();
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      // Since we're testing in a mock DOM, the escapeHtml function
      // should still work to prevent XSS
      const result = panel.escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });

    test('should handle null and undefined', () => {
      const container = new MockElement('div');
      const panel = new StepDetailsPanel(container);
      
      expect(panel.escapeHtml(null)).toBe('');
      expect(panel.escapeHtml(undefined)).toBe('');
    });
  });
});
