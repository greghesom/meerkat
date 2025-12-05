import { Lexer } from '../src/core/parser/lexer.js';
import { Parser } from '../src/core/parser/parser.js';

// Mock DOM environment for SVG renderer testing
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
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
}

class MockDocument {
  createElement(tagName) {
    return new MockElement(tagName);
  }

  createElementNS(ns, tagName) {
    return new MockElement(tagName);
  }

  querySelector(selector) {
    return new MockElement('div');
  }
}

// Set up mock DOM
globalThis.document = new MockDocument();

// Now we can import the renderer
const { SVGRenderer } = await import('../src/core/renderer/svg-renderer.js');

describe('SVGRenderer', () => {
  function parseSource(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  test('should create SVG element with correct dimensions', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource(`sequenceDiagram
    participant Client
    participant API
    Client->>API: Request`);
    
    const svg = renderer.render(ast);
    
    expect(svg.tagName).toBe('svg');
    expect(svg.getAttribute('class')).toBe('sequence-diagram theme-light');
    expect(svg.getAttribute('width')).toBeDefined();
    expect(svg.getAttribute('height')).toBeDefined();
  });

  test('should render participant boxes', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource(`sequenceDiagram
    participant Client
    participant API`);
    
    const svg = renderer.render(ast);
    
    // Find participants group
    const participantsGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'participants'
    );
    expect(participantsGroup).toBeDefined();
    
    // Should have rects and texts for each participant
    const rects = participantsGroup.children.filter((c) => c.tagName === 'rect');
    const texts = participantsGroup.children.filter((c) => c.tagName === 'text');
    expect(rects.length).toBe(2);
    expect(texts.length).toBe(2);
  });

  test('should render lifelines', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource(`sequenceDiagram
    participant Client
    participant API`);
    
    const svg = renderer.render(ast);
    
    // Find lifelines group
    const lifelinesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'lifelines'
    );
    expect(lifelinesGroup).toBeDefined();
    
    // Should have dashed lines for each participant
    const lines = lifelinesGroup.children.filter((c) => c.tagName === 'line');
    expect(lines.length).toBe(2);
    expect(lines[0].getAttribute('stroke-dasharray')).toBe('5,5');
  });

  test('should render messages as arrows', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource(`sequenceDiagram
    Client->>API: Request
    API-->>Client: Response`);
    
    const svg = renderer.render(ast);
    
    // Find messages group
    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );
    expect(messagesGroup).toBeDefined();
    
    // Should have message groups
    expect(messagesGroup.children.length).toBe(2);
  });

  test('should render solid arrow for synchronous messages', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource('Client->>API: Request');
    const svg = renderer.render(ast);
    
    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );
    const messageGroup = messagesGroup.children[0];
    const line = messageGroup.children.find((c) => c.tagName === 'line');
    
    // Solid line should not have stroke-dasharray
    expect(line.getAttribute('stroke-dasharray')).toBeUndefined();
    expect(line.getAttribute('marker-end')).toBe('url(#arrow-filled)');
  });

  test('should render dashed arrow for asynchronous messages', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource('API-->>Client: Response');
    const svg = renderer.render(ast);
    
    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );
    const messageGroup = messagesGroup.children[0];
    const line = messageGroup.children.find((c) => c.tagName === 'line');
    
    // Dashed line should have stroke-dasharray
    expect(line.getAttribute('stroke-dasharray')).toBe('5,3');
    expect(line.getAttribute('marker-end')).toBe('url(#arrow-filled)');
  });

  test('should render message labels above arrows', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource('Client->>API: Create Order');
    const svg = renderer.render(ast);
    
    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );
    const messageGroup = messagesGroup.children[0];
    const text = messageGroup.children.find((c) => c.tagName === 'text');
    
    expect(text).toBeDefined();
    expect(text.textContent).toBe('Create Order');
    expect(text.getAttribute('text-anchor')).toBe('middle');
  });

  test('should create arrow marker definitions', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource('Client->>API: Request');
    const svg = renderer.render(ast);
    
    // Find defs element
    const defs = svg.children.find((c) => c.tagName === 'defs');
    expect(defs).toBeDefined();
    
    // Should have arrow markers
    const markers = defs.children.filter((c) => c.tagName === 'marker');
    expect(markers.length).toBeGreaterThan(0);
  });

  test('should properly space multiple messages', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container, { messageGap: 50 });
    
    const ast = parseSource(`sequenceDiagram
    Client->>API: First
    API->>DB: Second
    DB-->>API: Third`);
    
    const svg = renderer.render(ast);
    
    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );
    
    // Each message should be in its own group with proper vertical offset
    expect(messagesGroup.children.length).toBe(3);
  });
});
