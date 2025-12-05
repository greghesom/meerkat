import {
  generateMessageLine,
  updateMessageInSource,
  insertMessageInSource,
  deleteMessageFromSource,
} from '../src/core/collaboration/diagram-generator.js';

describe('DiagramGenerator', () => {
  describe('generateMessageLine', () => {
    test('should generate simple message line', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Request',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {},
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client->>API: Request');
    });

    test('should generate message with dashed arrow', () => {
      const message = {
        source: 'API',
        target: 'Client',
        text: 'Response',
        arrow: { line: 'dashed', head: 'filled' },
        annotations: {},
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('API-->>Client: Response');
    });

    test('should generate message with open arrow', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Request',
        arrow: { line: 'solid', head: 'open' },
        annotations: {},
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client->API: Request');
    });

    test('should generate message with path annotation', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Get users',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {
          method: 'GET',
          path: '/api/users',
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client->>API: Get users @path(GET /api/users)');
    });

    test('should generate message with type annotation', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Request',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {
          requestType: 'JSON',
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client->>API: Request @type(JSON)');
    });

    test('should generate message with async annotation', () => {
      const message = {
        source: 'Client',
        target: 'Queue',
        text: 'Send event',
        arrow: { line: 'dashed', head: 'filled' },
        annotations: {
          isAsync: true,
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client-->>Queue: Send event @async');
    });

    test('should generate message with timeout annotation', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Request',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {
          timeout: '30s',
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client->>API: Request @timeout(30s)');
    });

    test('should generate message with queue annotation', () => {
      const message = {
        source: 'Client',
        target: 'Queue',
        text: 'Event',
        arrow: { line: 'dashed', head: 'filled' },
        annotations: {
          queue: 'user-events',
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client-->>Queue: Event @queue(user-events)');
    });

    test('should generate message with flow annotation', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Request',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {
          flows: ['happy_path'],
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client->>API: Request @flow(happy_path)');
    });

    test('should generate message with multiple flows', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Request',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {
          flows: ['happy_path', 'error_flow'],
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toBe('Client->>API: Request @flow(happy_path, error_flow)');
    });

    test('should generate message with all annotations', () => {
      const message = {
        source: 'Client',
        target: 'API',
        text: 'Create user',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {
          method: 'POST',
          path: '/api/users',
          requestType: 'JSON',
          isAsync: true,
          timeout: '30s',
          flows: ['happy_path'],
        },
      };
      
      const result = generateMessageLine(message);
      expect(result).toContain('Client->>API: Create user');
      expect(result).toContain('@path(POST /api/users)');
      expect(result).toContain('@type(JSON)');
      expect(result).toContain('@async');
      expect(result).toContain('@timeout(30s)');
      expect(result).toContain('@flow(happy_path)');
    });
  });

  describe('updateMessageInSource', () => {
    test('should update a message in source', () => {
      const source = `sequenceDiagram
    Client->>API: Request
    API-->>Client: Response`;
      
      const updatedMessage = {
        source: 'Client',
        target: 'API',
        text: 'Updated Request',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {},
      };
      
      const result = updateMessageInSource(source, 0, updatedMessage, {});
      expect(result).toContain('Client->>API: Updated Request');
      expect(result).toContain('API-->>Client: Response');
    });

    test('should update second message in source', () => {
      const source = `sequenceDiagram
    Client->>API: Request
    API-->>Client: Response`;
      
      const updatedMessage = {
        source: 'API',
        target: 'Client',
        text: 'Updated Response',
        arrow: { line: 'dashed', head: 'filled' },
        annotations: {},
      };
      
      const result = updateMessageInSource(source, 1, updatedMessage, {});
      expect(result).toContain('Client->>API: Request');
      expect(result).toContain('API-->>Client: Updated Response');
    });

    test('should preserve indentation when updating', () => {
      const source = `sequenceDiagram
    Client->>API: Request`;
      
      const updatedMessage = {
        source: 'Client',
        target: 'API',
        text: 'Updated',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {},
      };
      
      const result = updateMessageInSource(source, 0, updatedMessage, {});
      expect(result).toContain('    Client->>API: Updated');
    });
  });

  describe('insertMessageInSource', () => {
    test('should insert message at beginning', () => {
      const source = `sequenceDiagram
    Client->>API: Request`;
      
      const newMessage = {
        source: 'User',
        target: 'Client',
        text: 'Start',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {},
      };
      
      const result = insertMessageInSource(source, 0, newMessage, {});
      expect(result).toContain('User->>Client: Start');
      expect(result).toContain('Client->>API: Request');
    });

    test('should insert message at end', () => {
      const source = `sequenceDiagram
    Client->>API: Request`;
      
      const newMessage = {
        source: 'API',
        target: 'Client',
        text: 'Response',
        arrow: { line: 'dashed', head: 'filled' },
        annotations: {},
      };
      
      const result = insertMessageInSource(source, 1, newMessage, {});
      expect(result).toContain('Client->>API: Request');
      expect(result).toContain('API-->>Client: Response');
    });

    test('should insert message in middle', () => {
      const source = `sequenceDiagram
    Client->>API: First
    API-->>Client: Third`;
      
      const newMessage = {
        source: 'API',
        target: 'DB',
        text: 'Second',
        arrow: { line: 'solid', head: 'filled' },
        annotations: {},
      };
      
      const result = insertMessageInSource(source, 1, newMessage, {});
      expect(result).toContain('Client->>API: First');
      expect(result).toContain('API->>DB: Second');
      expect(result).toContain('API-->>Client: Third');
    });
  });

  describe('deleteMessageFromSource', () => {
    test('should delete first message', () => {
      const source = `sequenceDiagram
    Client->>API: Request
    API-->>Client: Response`;
      
      const result = deleteMessageFromSource(source, 0);
      expect(result).not.toContain('Client->>API: Request');
      expect(result).toContain('API-->>Client: Response');
    });

    test('should delete second message', () => {
      const source = `sequenceDiagram
    Client->>API: Request
    API-->>Client: Response`;
      
      const result = deleteMessageFromSource(source, 1);
      expect(result).toContain('Client->>API: Request');
      expect(result).not.toContain('API-->>Client: Response');
    });

    test('should delete middle message', () => {
      const source = `sequenceDiagram
    Client->>API: First
    API->>DB: Second
    DB-->>API: Third`;
      
      const result = deleteMessageFromSource(source, 1);
      expect(result).toContain('Client->>API: First');
      expect(result).not.toContain('API->>DB: Second');
      expect(result).toContain('DB-->>API: Third');
    });
  });
});
