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

  test('should render title prominently when present', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource(`sequenceDiagram
    title: Order Checkout Flow
    Client->>API: Request`);
    
    const svg = renderer.render(ast);
    
    // Find title text element
    const titleElement = svg.children.find(
      (c) => c.tagName === 'text' && c.getAttribute('class') === 'diagram-title'
    );
    expect(titleElement).toBeDefined();
    expect(titleElement.textContent).toBe('Order Checkout Flow');
    expect(titleElement.getAttribute('font-size')).toBe('18');
    expect(titleElement.getAttribute('font-weight')).toBe('600');
    expect(titleElement.getAttribute('text-anchor')).toBe('middle');
  });

  test('should not render title when not present', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const ast = parseSource(`sequenceDiagram
    Client->>API: Request`);
    
    const svg = renderer.render(ast);
    
    // Should not find title element
    const titleElement = svg.children.find(
      (c) => c.tagName === 'text' && c.getAttribute('class') === 'diagram-title'
    );
    expect(titleElement).toBeUndefined();
  });

  test('should increase diagram height when title is present', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);
    
    const astWithTitle = parseSource(`sequenceDiagram
    title: Test Title
    Client->>API: Request`);
    
    const astWithoutTitle = parseSource(`sequenceDiagram
    Client->>API: Request`);
    
    const svgWithTitle = renderer.render(astWithTitle);
    const svgWithoutTitle = renderer.render(astWithoutTitle);
    
    const heightWithTitle = parseInt(svgWithTitle.getAttribute('height'));
    const heightWithoutTitle = parseInt(svgWithoutTitle.getAttribute('height'));
    
    // Diagram with title should be taller
    expect(heightWithTitle).toBeGreaterThan(heightWithoutTitle);
  });

  describe('API Path Annotations', () => {
    test('should render API path badge with HTTP method', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Get Products @path(GET /api/v1/products)`);
      
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      
      // Should have a message-label-group (containing text and path badge)
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      expect(labelGroup).toBeDefined();
      
      // Should contain the api-path-badge group
      const pathBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'api-path-badge'
      );
      expect(pathBadge).toBeDefined();
    });

    test('should render HTTP method with correct color', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Create User @path(POST /api/users)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      const pathBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'api-path-badge'
      );
      
      // Find the method rect (POST should be green: #49cc90)
      const methodRect = pathBadge.children.find(
        (c) => c.tagName === 'rect' && c.getAttribute('class')?.includes('http-method-post')
      );
      expect(methodRect).toBeDefined();
      expect(methodRect.getAttribute('fill')).toBe('#49cc90');
    });

    test('should render different colors for different HTTP methods', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      // Test GET method (blue)
      const astGet = parseSource('Client->>API: Request @path(GET /api/users)');
      const svgGet = renderer.render(astGet);
      const messagesGroupGet = svgGet.children.find((c) => c.getAttribute('class') === 'messages');
      const pathBadgeGet = messagesGroupGet.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      ).children.find((c) => c.getAttribute('class') === 'api-path-badge');
      const methodRectGet = pathBadgeGet.children.find(
        (c) => c.getAttribute('class')?.includes('http-method-get')
      );
      expect(methodRectGet.getAttribute('fill')).toBe('#61affe');
      
      // Test DELETE method (red)
      const astDelete = parseSource('Client->>API: Remove @path(DELETE /api/users/1)');
      const svgDelete = renderer.render(astDelete);
      const messagesGroupDelete = svgDelete.children.find((c) => c.getAttribute('class') === 'messages');
      const pathBadgeDelete = messagesGroupDelete.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      ).children.find((c) => c.getAttribute('class') === 'api-path-badge');
      const methodRectDelete = pathBadgeDelete.children.find(
        (c) => c.getAttribute('class')?.includes('http-method-delete')
      );
      expect(methodRectDelete.getAttribute('fill')).toBe('#f93e3e');
    });

    test('should include tooltip with full path info', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @path(GET /api/users)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const labelGroup = messagesGroup.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      const pathBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'api-path-badge'
      );
      
      // Find the title element (tooltip)
      const tooltip = pathBadge.children.find((c) => c.tagName === 'title');
      expect(tooltip).toBeDefined();
      expect(tooltip.textContent).toBe('GET /api/users');
    });

    test('should render path without method', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @path(/api/users)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const labelGroup = messagesGroup.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      const pathBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'api-path-badge'
      );
      
      // Should have path rect but no method rect
      const pathRect = pathBadge.children.find(
        (c) => c.tagName === 'rect' && c.getAttribute('class') === 'api-path'
      );
      expect(pathRect).toBeDefined();
      
      // No method rect (check that http-method class doesn't exist)
      const methodRect = pathBadge.children.find(
        (c) => c.getAttribute('class')?.includes('http-method-')
      );
      expect(methodRect).toBeUndefined();
    });

    test('should support all HTTP methods', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const expectedColors = {
        GET: '#61affe',
        POST: '#49cc90',
        PUT: '#fca130',
        DELETE: '#f93e3e',
        PATCH: '#50e3c2',
      };
      
      methods.forEach(method => {
        const ast = parseSource(`Client->>API: Request @path(${method} /api/test)`);
        const svg = renderer.render(ast);
        
        const messagesGroup = svg.children.find((c) => c.getAttribute('class') === 'messages');
        const pathBadge = messagesGroup.children[0].children.find(
          (c) => c.getAttribute('class') === 'message-label-group'
        ).children.find((c) => c.getAttribute('class') === 'api-path-badge');
        
        const methodRect = pathBadge.children.find(
          (c) => c.getAttribute('class')?.includes(`http-method-${method.toLowerCase()}`)
        );
        expect(methodRect).toBeDefined();
        expect(methodRect.getAttribute('fill')).toBe(expectedColors[method]);
      });
    });

    test('should increase diagram height when path annotations are present', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const astWithPath = parseSource(`sequenceDiagram
      Client->>API: Request @path(GET /api/users)`);
      
      const astWithoutPath = parseSource(`sequenceDiagram
      Client->>API: Request`);
      
      const svgWithPath = renderer.render(astWithPath);
      const svgWithoutPath = renderer.render(astWithoutPath);
      
      const heightWithPath = parseInt(svgWithPath.getAttribute('height'));
      const heightWithoutPath = parseInt(svgWithoutPath.getAttribute('height'));
      
      // Diagram with path annotations should be taller
      expect(heightWithPath).toBeGreaterThan(heightWithoutPath);
    });

    test('should render message text above path badge', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Get Products @path(GET /api/products)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const labelGroup = messagesGroup.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      // Find message text
      const messageText = labelGroup.children.find(
        (c) => c.tagName === 'text' && c.getAttribute('class') === 'message-label'
      );
      expect(messageText).toBeDefined();
      expect(messageText.textContent).toBe('Get Products');
    });
  });

  describe('Request Type Annotations', () => {
    test('should render request type badge with protocol', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Create Order @type(JSON)`);
      
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      
      // Should have a message-label-group (containing text and type badge)
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      expect(labelGroup).toBeDefined();
      
      // Should contain the request-type-badge group
      const typeBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'request-type-badge'
      );
      expect(typeBadge).toBeDefined();
    });

    test('should render request type with correct color for JSON', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @type(JSON)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      const typeBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'request-type-badge'
      );
      
      // Find the type rect (JSON should be green: #4caf50)
      const typeRect = typeBadge.children.find(
        (c) => c.tagName === 'rect' && c.getAttribute('class')?.includes('request-type-json')
      );
      expect(typeRect).toBeDefined();
      expect(typeRect.getAttribute('fill')).toBe('#4caf50');
    });

    test('should render different colors for different request types', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const typesAndColors = {
        'JSON': '#4caf50',
        'SOAP': '#ff9800',
        'XML': '#9c27b0',
        'RFC_SAP': '#1976d2',
        'GraphQL': '#e535ab',
        'gRPC': '#244c5a',
        'BINARY': '#607d8b',
      };
      
      Object.entries(typesAndColors).forEach(([type, expectedColor]) => {
        const ast = parseSource(`Client->>API: Request @type(${type})`);
        const svg = renderer.render(ast);
        
        const messagesGroup = svg.children.find((c) => c.getAttribute('class') === 'messages');
        const labelGroup = messagesGroup.children[0].children.find(
          (c) => c.getAttribute('class') === 'message-label-group'
        );
        const typeBadge = labelGroup.children.find(
          (c) => c.getAttribute('class') === 'request-type-badge'
        );
        
        const typeRect = typeBadge.children.find((c) => c.tagName === 'rect');
        expect(typeRect.getAttribute('fill')).toBe(expectedColor);
      });
    });

    test('should render custom request type with default color', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @type(CUSTOM_PROTOCOL)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const labelGroup = messagesGroup.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      const typeBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'request-type-badge'
      );
      
      // Custom types should use the default gray color: #757575
      const typeRect = typeBadge.children.find((c) => c.tagName === 'rect');
      expect(typeRect.getAttribute('fill')).toBe('#757575');
    });

    test('should include tooltip with protocol info', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @type(JSON)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const labelGroup = messagesGroup.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      const typeBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'request-type-badge'
      );
      
      // Find the title element (tooltip)
      const tooltip = typeBadge.children.find((c) => c.tagName === 'title');
      expect(tooltip).toBeDefined();
      expect(tooltip.textContent).toBe('Protocol: JSON');
    });

    test('should render both request type and path badges together', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Create Order @type(JSON) @path(POST /orders)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const labelGroup = messagesGroup.children[0].children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      // Should have both badges
      const typeBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'request-type-badge'
      );
      const pathBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'api-path-badge'
      );
      
      expect(typeBadge).toBeDefined();
      expect(pathBadge).toBeDefined();
    });

    test('should render protocol legend when request types are used', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request @type(JSON)
      API->>SAP: Call @type(RFC_SAP)`);
      
      const svg = renderer.render(ast);
      
      // Find protocol legend group
      const legendGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'protocol-legend'
      );
      expect(legendGroup).toBeDefined();
      
      // Should have legend title and badges for JSON and RFC_SAP
      const texts = legendGroup.children.filter((c) => c.tagName === 'text');
      expect(texts.length).toBeGreaterThanOrEqual(1); // At least the title
      
      // Should have type badges
      const rects = legendGroup.children.filter((c) => c.tagName === 'rect');
      expect(rects.length).toBe(2); // JSON and RFC_SAP
    });

    test('should not render protocol legend when no request types are used', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource(`sequenceDiagram
      Client->>API: Request
      API-->>Client: Response`);
      
      const svg = renderer.render(ast);
      
      // Should not find protocol legend
      const legendGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'protocol-legend'
      );
      expect(legendGroup).toBeUndefined();
    });

    test('should increase diagram height when request type annotations are present', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const astWithType = parseSource(`sequenceDiagram
      Client->>API: Request @type(JSON)`);
      
      const astWithoutType = parseSource(`sequenceDiagram
      Client->>API: Request`);
      
      const svgWithType = renderer.render(astWithType);
      const svgWithoutType = renderer.render(astWithoutType);
      
      const heightWithType = parseInt(svgWithType.getAttribute('height'));
      const heightWithoutType = parseInt(svgWithoutType.getAttribute('height'));
      
      // Diagram with request type annotations should be taller (includes legend)
      expect(heightWithType).toBeGreaterThan(heightWithoutType);
    });
  });

  describe('Sync/Async Request Indicators', () => {
    test('should render async icon for @async annotated messages', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource(`sequenceDiagram
      API-->>Queue: Emit Event @async`);
      
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      expect(labelGroup).toBeDefined();
      
      // Should have async icon
      const asyncIcon = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'async-icon'
      );
      expect(asyncIcon).toBeDefined();
    });

    test('should render timeout badge for @timeout annotation', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('API->>Database: Query @sync @timeout(100ms)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      expect(labelGroup).toBeDefined();
      
      // Should have sync-async-indicator
      const indicator = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'sync-async-indicator'
      );
      expect(indicator).toBeDefined();
      
      // Should have text with timeout
      const text = indicator.children.find((c) => c.tagName === 'text');
      expect(text).toBeDefined();
      expect(text.textContent).toContain('100ms');
    });

    test('should render queue badge for @queue annotation', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('API-->>Queue: Emit Event @async @queue(user-events)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      expect(labelGroup).toBeDefined();
      
      // Should have sync-async-indicator
      const indicator = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'sync-async-indicator'
      );
      expect(indicator).toBeDefined();
      
      // Should have text with queue name
      const text = indicator.children.find((c) => c.tagName === 'text');
      expect(text).toBeDefined();
      expect(text.textContent).toContain('user-events');
    });

    test('should render both timeout and queue in same badge', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('API-->>Queue: Event @async @timeout(5000ms) @queue(events)');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      const indicator = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'sync-async-indicator'
      );
      expect(indicator).toBeDefined();
      
      const text = indicator.children.find((c) => c.tagName === 'text');
      expect(text.textContent).toContain('5000ms');
      expect(text.textContent).toContain('events');
    });

    test('should render dashed line for @async messages', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      // Use solid arrow (->>) with @async annotation - should render as dashed
      const ast = parseSource('API->>Queue: Event @async');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const line = messageGroup.children.find((c) => c.tagName === 'line');
      
      // Should have dashed pattern for async
      expect(line.getAttribute('stroke-dasharray')).toBe('5,3');
    });

    test('should render solid line for @sync messages', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      // Use solid arrow (->>) with @sync annotation - should remain solid
      const ast = parseSource('Client->>API: Request @sync');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const line = messageGroup.children.find((c) => c.tagName === 'line');
      
      // Should NOT have dashed pattern for sync
      expect(line.getAttribute('stroke-dasharray')).toBeUndefined();
    });

    test('async icon should have tooltip', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('API-->>Queue: Event @async');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      const asyncIcon = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'async-icon'
      );
      
      const tooltip = asyncIcon.children.find((c) => c.tagName === 'title');
      expect(tooltip).toBeDefined();
      expect(tooltip.textContent).toBe('Asynchronous');
    });

    test('should increase diagram height when timeout/queue annotations are present', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const astWithAnnotations = parseSource(`sequenceDiagram
      API->>DB: Query @timeout(100ms)`);
      
      const astWithoutAnnotations = parseSource(`sequenceDiagram
      API->>DB: Query`);
      
      const svgWith = renderer.render(astWithAnnotations);
      const svgWithout = renderer.render(astWithoutAnnotations);
      
      const heightWith = parseInt(svgWith.getAttribute('height'));
      const heightWithout = parseInt(svgWithout.getAttribute('height'));
      
      // Diagram with annotations should be taller
      expect(heightWith).toBeGreaterThan(heightWithout);
    });
  });

  describe('Request/Response Payload Annotations', () => {
    test('should render request payload badge with inline schema', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Create User @request{name: string, email: string}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      expect(labelGroup).toBeDefined();
      
      // Should have payload badge
      const payloadBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-request')
      );
      expect(payloadBadge).toBeDefined();
    });

    test('should render response payload badge with inline schema', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('API-->>Client: User Created @response{id: uuid, created_at: timestamp}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      expect(labelGroup).toBeDefined();
      
      // Should have payload badge
      const payloadBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-response')
      );
      expect(payloadBadge).toBeDefined();
    });

    test('should render both request and response payload badges', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Create User @request{name: string} @response{id: uuid}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      // Should have both badges
      const requestBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-request')
      );
      const responseBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-response')
      );
      
      expect(requestBadge).toBeDefined();
      expect(responseBadge).toBeDefined();
    });

    test('should render payload badge with link icon for URL reference', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @request{https://api.example.com/schemas/user}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      const payloadBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-request')
      );
      expect(payloadBadge).toBeDefined();
      
      // Badge text should include link icon
      const badgeText = payloadBadge.children.find((c) => c.tagName === 'text');
      expect(badgeText).toBeDefined();
      expect(badgeText.textContent).toContain('🔗');
    });

    test('should include tooltip with full schema info', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @request{name: string, email: string}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      const payloadBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-request')
      );
      
      // Find the title element (tooltip)
      const tooltip = payloadBadge.children.find((c) => c.tagName === 'title');
      expect(tooltip).toBeDefined();
      expect(tooltip.textContent).toContain('Request Schema');
      expect(tooltip.textContent).toContain('name: string, email: string');
    });

    test('should render payload with path and type annotations together', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Create User @path(POST /users) @type(JSON) @request{name: string}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      // Should have all badges
      const pathBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'api-path-badge'
      );
      const typeBadge = labelGroup.children.find(
        (c) => c.getAttribute('class') === 'request-type-badge'
      );
      const payloadBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-request')
      );
      
      expect(pathBadge).toBeDefined();
      expect(typeBadge).toBeDefined();
      expect(payloadBadge).toBeDefined();
    });

    test('should increase diagram height when payload annotations are present', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const astWithPayload = parseSource(`sequenceDiagram
      Client->>API: Request @request{name: string}`);
      
      const astWithoutPayload = parseSource(`sequenceDiagram
      Client->>API: Request`);
      
      const svgWithPayload = renderer.render(astWithPayload);
      const svgWithoutPayload = renderer.render(astWithoutPayload);
      
      const heightWithPayload = parseInt(svgWithPayload.getAttribute('height'));
      const heightWithoutPayload = parseInt(svgWithoutPayload.getAttribute('height'));
      
      // Diagram with payload annotations should be taller
      expect(heightWithPayload).toBeGreaterThan(heightWithoutPayload);
    });

    test('should render request badge with correct color (blue)', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('Client->>API: Request @request{name: string}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      const payloadBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-request')
      );
      
      // Find the rect element (background)
      const rect = payloadBadge.children.find((c) => c.tagName === 'rect');
      expect(rect).toBeDefined();
      expect(rect.getAttribute('fill')).toBe('#2196f3');
    });

    test('should render response badge with correct color (green)', () => {
      const container = new MockElement('div');
      const renderer = new SVGRenderer(container);
      
      const ast = parseSource('API-->>Client: Response @response{id: uuid}');
      const svg = renderer.render(ast);
      
      const messagesGroup = svg.children.find(
        (c) => c.getAttribute('class') === 'messages'
      );
      const messageGroup = messagesGroup.children[0];
      const labelGroup = messageGroup.children.find(
        (c) => c.getAttribute('class') === 'message-label-group'
      );
      
      const payloadBadge = labelGroup.children.find(
        (c) => c.getAttribute('class')?.includes('payload-response')
      );
      
      // Find the rect element (background)
      const rect = payloadBadge.children.find((c) => c.tagName === 'rect');
      expect(rect).toBeDefined();
      expect(rect.getAttribute('fill')).toBe('#4caf50');
    });
  });
});
