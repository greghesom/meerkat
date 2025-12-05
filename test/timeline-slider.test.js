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
const { SVGRenderer, StepState } = await import('../src/core/renderer/svg-renderer.js');
const { TimelineSlider } = await import('../src/core/timeline/timeline-slider.js');

describe('TimelineSlider', () => {
  function parseSource(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  describe('initialization', () => {
    test('should initialize with total steps', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(5);

      expect(slider.getTotalSteps()).toBe(5);
      expect(slider.getCurrentStep()).toBe(5); // Starts showing all steps
    });

    test('should default to showing all steps', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(10);

      expect(slider.getCurrentStep()).toBe(10);
    });
  });

  describe('step navigation', () => {
    test('should go to a specific step', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(10);

      slider.goToStep(5);
      expect(slider.getCurrentStep()).toBe(5);
    });

    test('should go to next step', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(10);

      slider.goToStep(5);
      slider.nextStep();
      expect(slider.getCurrentStep()).toBe(6);
    });

    test('should go to previous step', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(10);

      slider.goToStep(5);
      slider.previousStep();
      expect(slider.getCurrentStep()).toBe(4);
    });

    test('should not go below step 0', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(10);

      slider.goToStep(0);
      slider.previousStep();
      expect(slider.getCurrentStep()).toBe(0);
    });

    test('should not go above total steps', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(10);

      slider.goToStep(10);
      slider.nextStep();
      expect(slider.getCurrentStep()).toBe(10);
    });

    test('should clamp step to valid range', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(10);

      slider.goToStep(-5);
      expect(slider.getCurrentStep()).toBe(0);

      slider.goToStep(100);
      expect(slider.getCurrentStep()).toBe(10);
    });
  });

  describe('message state calculation', () => {
    test('should return FUTURE for all messages when at step 0', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(5);
      slider.goToStep(0);

      expect(slider.getMessageState(0)).toBe(StepState.FUTURE);
      expect(slider.getMessageState(1)).toBe(StepState.FUTURE);
      expect(slider.getMessageState(4)).toBe(StepState.FUTURE);
    });

    test('should return CURRENT for the current step message', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(5);
      slider.goToStep(3);

      // Step 3 means message at index 2 is current (0-based)
      expect(slider.getMessageState(2)).toBe(StepState.CURRENT);
    });

    test('should return PAST for messages before current step', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(5);
      slider.goToStep(3);

      // Messages at indices 0 and 1 are past
      expect(slider.getMessageState(0)).toBe(StepState.PAST);
      expect(slider.getMessageState(1)).toBe(StepState.PAST);
    });

    test('should return FUTURE for messages after current step', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(5);
      slider.goToStep(3);

      // Messages at indices 3 and 4 are future
      expect(slider.getMessageState(3)).toBe(StepState.FUTURE);
      expect(slider.getMessageState(4)).toBe(StepState.FUTURE);
    });

    test('should correctly identify first message as current at step 1', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(5);
      slider.goToStep(1);

      expect(slider.getMessageState(0)).toBe(StepState.CURRENT);
      expect(slider.getMessageState(1)).toBe(StepState.FUTURE);
    });

    test('should correctly identify last message as current at total steps', () => {
      const container = new MockElement('div');
      const slider = new TimelineSlider(container);
      slider.init(5);
      slider.goToStep(5);

      expect(slider.getMessageState(3)).toBe(StepState.PAST);
      expect(slider.getMessageState(4)).toBe(StepState.CURRENT);
    });
  });

  describe('onChange callback', () => {
    test('should call onChange when step changes', () => {
      const container = new MockElement('div');
      let calledWith = null;
      const onChange = (step, total) => { calledWith = { step, total }; };
      const slider = new TimelineSlider(container, { onChange });
      slider.init(10);

      slider.goToStep(5);
      expect(calledWith).toEqual({ step: 5, total: 10 });
    });

    test('should call onChange with correct values on nextStep', () => {
      const container = new MockElement('div');
      let calledWith = null;
      const onChange = (step, total) => { calledWith = { step, total }; };
      const slider = new TimelineSlider(container, { onChange });
      slider.init(10);

      slider.goToStep(5);
      calledWith = null;
      slider.nextStep();
      expect(calledWith).toEqual({ step: 6, total: 10 });
    });
  });
});

describe('SVGRenderer with Timeline', () => {
  function parseSource(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  test('should render without timeline state (show all messages)', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Request
    API-->>Client: Response`);

    const svg = renderer.render(ast);

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );
    
    // Both messages should be visible (no step classes)
    messagesGroup.children.forEach(messageGroup => {
      expect(messageGroup.getAttribute('class')).not.toContain('step-');
      expect(messageGroup.getAttribute('opacity')).toBeUndefined();
    });
  });

  test('should apply step-past class to past messages', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Step 1
    API->>DB: Step 2
    DB-->>API: Step 3`);

    // Render at step 3 (message at index 2 is current)
    const svg = renderer.render(ast, { currentStep: 3 });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // First two messages should be past
    expect(messagesGroup.children[0].getAttribute('class')).toContain('step-past');
    expect(messagesGroup.children[1].getAttribute('class')).toContain('step-past');
    // Third message should be current
    expect(messagesGroup.children[2].getAttribute('class')).toContain('step-current');
  });

  test('should apply step-current class to current message', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Step 1
    API->>DB: Step 2
    DB-->>API: Step 3`);

    // Render at step 2
    const svg = renderer.render(ast, { currentStep: 2 });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // Second message (index 1) should be current
    expect(messagesGroup.children[1].getAttribute('class')).toContain('step-current');
  });

  test('should apply step-future class to future messages', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Step 1
    API->>DB: Step 2
    DB-->>API: Step 3`);

    // Render at step 1
    const svg = renderer.render(ast, { currentStep: 1 });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // Second and third messages should be future
    expect(messagesGroup.children[1].getAttribute('class')).toContain('step-future');
    expect(messagesGroup.children[2].getAttribute('class')).toContain('step-future');
  });

  test('should apply muted opacity to past messages', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Step 1
    API->>DB: Step 2`);

    // Render at step 2
    const svg = renderer.render(ast, { currentStep: 2 });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // First message should have muted opacity (0.4)
    expect(messagesGroup.children[0].getAttribute('opacity')).toBe('0.4');
  });

  test('should apply full opacity to current message', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Step 1
    API->>DB: Step 2`);

    // Render at step 2
    const svg = renderer.render(ast, { currentStep: 2 });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // Second message should have full opacity
    expect(messagesGroup.children[1].getAttribute('opacity')).toBe('1');
  });

  test('should apply hidden opacity to future messages', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Step 1
    API->>DB: Step 2`);

    // Render at step 1
    const svg = renderer.render(ast, { currentStep: 1 });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // Second message should have hidden opacity (0.15)
    expect(messagesGroup.children[1].getAttribute('opacity')).toBe('0.15');
  });

  test('should show all messages as future at step 0', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    Client->>API: Step 1
    API->>DB: Step 2
    DB-->>API: Step 3`);

    // Render at step 0 (start state)
    const svg = renderer.render(ast, { currentStep: 0 });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // All messages should be future
    messagesGroup.children.forEach(messageGroup => {
      expect(messageGroup.getAttribute('class')).toContain('step-future');
      expect(messageGroup.getAttribute('opacity')).toBe('0.15');
    });
  });

  test('should work with flow filtering and timeline together', () => {
    const container = new MockElement('div');
    const renderer = new SVGRenderer(container);

    const ast = parseSource(`sequenceDiagram
    %%flow happy_path "Happy Path" #22C55E
    %%flow error_flow "Error Flow" #EF4444
    Client->>API: Step 1 @flow(happy_path)
    API->>DB: Step 2 @flow(happy_path)
    DB-->>API: Step 3 @flow(error_flow)`);

    // Render with both activeFlow and currentStep
    const svg = renderer.render(ast, { 
      activeFlow: 'happy_path',
      currentStep: 2 
    });

    const messagesGroup = svg.children.find(
      (c) => c.getAttribute('class') === 'messages'
    );

    // First message should be past
    expect(messagesGroup.children[0].getAttribute('class')).toContain('step-past');
    // Second message should be current
    expect(messagesGroup.children[1].getAttribute('class')).toContain('step-current');
    // Third message should be hidden (not in active flow) - no step state since it's hidden
    expect(messagesGroup.children[2].getAttribute('class')).toContain('flow-hidden');
    expect(messagesGroup.children[2].getAttribute('class')).not.toContain('step-');
  });
});

describe('StepState enum', () => {
  test('should export PAST, CURRENT, and FUTURE states', () => {
    expect(StepState.PAST).toBe('past');
    expect(StepState.CURRENT).toBe('current');
    expect(StepState.FUTURE).toBe('future');
  });
});
