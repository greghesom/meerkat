// Mock DOM environment for split pane testing
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
      for (const child of this.children) {
        if (child.id === id) return child;
        const found = child.querySelector?.(selector);
        if (found) return found;
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    return [];
  }

  getBoundingClientRect() {
    return { width: 1000, height: 500, left: 0, top: 0 };
  }
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
      if (key === selector || el.id === selector.slice(1)) {
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
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

// Now import the SplitPane
const { SplitPane } = await import('../src/core/editor/split-pane.js');

describe('SplitPane', () => {
  let container;
  let splitPane;

  beforeEach(() => {
    container = new MockElement('div');
    container.id = 'test-container';
    container.style.width = '1000px';
    container.style.height = '500px';
    globalThis.document.elements.set('#test-container', container);
  });

  afterEach(() => {
    if (splitPane) {
      splitPane.destroy();
    }
  });

  describe('initialization', () => {
    test('should initialize with a container element', () => {
      splitPane = new SplitPane(container);
      expect(splitPane.container).toBe(container);
      expect(splitPane.wrapperElement).not.toBeNull();
    });

    test('should initialize with a selector string', () => {
      splitPane = new SplitPane('#test-container');
      expect(splitPane.container).toBe(container);
    });

    test('should create left and right panes', () => {
      splitPane = new SplitPane(container);
      expect(splitPane.leftPane).not.toBeNull();
      expect(splitPane.rightPane).not.toBeNull();
    });

    test('should create a divider', () => {
      splitPane = new SplitPane(container);
      expect(splitPane.divider).not.toBeNull();
    });

    test('should accept custom options', () => {
      const onResize = () => {};
      splitPane = new SplitPane(container, {
        minPaneSize: 250,
        initialSplit: 0.5,
        dividerSize: 10,
        onResize,
      });
      expect(splitPane.options.minPaneSize).toBe(250);
      expect(splitPane.options.initialSplit).toBe(0.5);
      expect(splitPane.options.dividerSize).toBe(10);
      expect(splitPane.options.onResize).toBe(onResize);
    });
  });

  describe('content', () => {
    test('should add left content', () => {
      const leftContent = new MockElement('div');
      leftContent.id = 'left-content';
      
      splitPane = new SplitPane(container, {
        leftContent,
      });
      
      expect(splitPane.leftPane.children).toContain(leftContent);
    });

    test('should add right content', () => {
      const rightContent = new MockElement('div');
      rightContent.id = 'right-content';
      
      splitPane = new SplitPane(container, {
        rightContent,
      });
      
      expect(splitPane.rightPane.children).toContain(rightContent);
    });

    test('should add both left and right content', () => {
      const leftContent = new MockElement('div');
      leftContent.id = 'left-content';
      const rightContent = new MockElement('div');
      rightContent.id = 'right-content';
      
      splitPane = new SplitPane(container, {
        leftContent,
        rightContent,
      });
      
      expect(splitPane.leftPane.children).toContain(leftContent);
      expect(splitPane.rightPane.children).toContain(rightContent);
    });
  });

  describe('getLeftPane and getRightPane', () => {
    test('should return left pane element', () => {
      splitPane = new SplitPane(container);
      expect(splitPane.getLeftPane()).toBe(splitPane.leftPane);
    });

    test('should return right pane element', () => {
      splitPane = new SplitPane(container);
      expect(splitPane.getRightPane()).toBe(splitPane.rightPane);
    });
  });

  describe('setSplit', () => {
    test('should update split ratio', () => {
      splitPane = new SplitPane(container);
      splitPane.setSplit(0.6);
      expect(splitPane.splitRatio).toBe(0.6);
    });

    test('should clamp split ratio to minimum', () => {
      splitPane = new SplitPane(container);
      splitPane.setSplit(0.05);
      expect(splitPane.splitRatio).toBe(0.1);
    });

    test('should clamp split ratio to maximum', () => {
      splitPane = new SplitPane(container);
      splitPane.setSplit(0.95);
      expect(splitPane.splitRatio).toBe(0.9);
    });
  });

  describe('dragging', () => {
    test('should start dragging on mousedown', () => {
      splitPane = new SplitPane(container);
      const event = { 
        type: 'mousedown',
        bubbles: true,
        preventDefault: () => {},
      };
      
      splitPane.startDragging(event);
      
      expect(splitPane.isDragging).toBe(true);
      expect(splitPane.wrapperElement.classList.contains('dragging')).toBe(true);
    });

    test('should stop dragging', () => {
      splitPane = new SplitPane(container);
      
      // Start dragging
      splitPane.startDragging({ preventDefault: () => {} });
      
      // Stop dragging
      splitPane.stopDragging();
      
      expect(splitPane.isDragging).toBe(false);
      expect(splitPane.wrapperElement.classList.contains('dragging')).toBe(false);
    });
  });

  describe('structure', () => {
    test('should have correct class names', () => {
      splitPane = new SplitPane(container);
      
      expect(splitPane.wrapperElement.className).toContain('split-pane');
      expect(splitPane.leftPane.className).toContain('split-pane-left');
      expect(splitPane.rightPane.className).toContain('split-pane-right');
      expect(splitPane.divider.className).toContain('split-pane-divider');
    });

    test('should render panes in correct order', () => {
      splitPane = new SplitPane(container);
      const children = splitPane.wrapperElement.children;
      
      expect(children[0]).toBe(splitPane.leftPane);
      expect(children[1]).toBe(splitPane.divider);
      expect(children[2]).toBe(splitPane.rightPane);
    });
  });

  describe('destroy', () => {
    test('should clean up resources', () => {
      splitPane = new SplitPane(container);
      splitPane.destroy();
      
      expect(splitPane.wrapperElement).toBeNull();
      expect(splitPane.leftPane).toBeNull();
      expect(splitPane.rightPane).toBeNull();
      expect(splitPane.divider).toBeNull();
    });
  });
});
