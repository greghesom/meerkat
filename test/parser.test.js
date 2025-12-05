import { Lexer } from '../src/core/parser/lexer.js';
import { Parser, NodeType } from '../src/core/parser/parser.js';

describe('Parser', () => {
  function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  describe('parse', () => {
    test('should parse empty sequence diagram', () => {
      const ast = parse('sequenceDiagram');
      
      expect(ast.type).toBe(NodeType.DIAGRAM);
      expect(ast.participants).toEqual([]);
      expect(ast.messages).toEqual([]);
    });

    test('should parse participant declarations', () => {
      const ast = parse(`sequenceDiagram
    participant Client
    participant API`);
      
      expect(ast.participants).toHaveLength(2);
      expect(ast.participants[0].id).toBe('Client');
      expect(ast.participants[0].displayName).toBe('Client');
      expect(ast.participants[1].id).toBe('API');
    });

    test('should parse participant with alias', () => {
      const ast = parse(`sequenceDiagram
    participant FE as Frontend`);
      
      expect(ast.participants).toHaveLength(1);
      expect(ast.participants[0].id).toBe('FE');
      expect(ast.participants[0].displayName).toBe('Frontend');
    });

    test('should parse simple message', () => {
      const ast = parse(`sequenceDiagram
    Client->>API: Create Order`);
      
      expect(ast.messages).toHaveLength(1);
      expect(ast.messages[0].source).toBe('Client');
      expect(ast.messages[0].target).toBe('API');
      expect(ast.messages[0].text).toBe('Create Order');
    });

    test('should parse solid arrow type', () => {
      const ast = parse('Client->>API: Request');
      
      expect(ast.messages[0].arrow.line).toBe('solid');
      expect(ast.messages[0].arrow.head).toBe('filled');
    });

    test('should parse dashed arrow type', () => {
      const ast = parse('API-->>Client: Response');
      
      expect(ast.messages[0].arrow.line).toBe('dashed');
      expect(ast.messages[0].arrow.head).toBe('filled');
    });

    test('should parse open arrow head', () => {
      const ast = parse('Client->API: Request');
      
      expect(ast.messages[0].arrow.line).toBe('solid');
      expect(ast.messages[0].arrow.head).toBe('open');
    });

    test('should parse dashed open arrow', () => {
      const ast = parse('API-->Client: Response');
      
      expect(ast.messages[0].arrow.line).toBe('dashed');
      expect(ast.messages[0].arrow.head).toBe('open');
    });

    test('should parse multiple messages', () => {
      const ast = parse(`sequenceDiagram
    Client->>API: Request
    API->>Database: Query
    Database-->>API: Result
    API-->>Client: Response`);
      
      expect(ast.messages).toHaveLength(4);
      expect(ast.messages[0].source).toBe('Client');
      expect(ast.messages[0].target).toBe('API');
      expect(ast.messages[1].source).toBe('API');
      expect(ast.messages[1].target).toBe('Database');
      expect(ast.messages[2].source).toBe('Database');
      expect(ast.messages[2].target).toBe('API');
      expect(ast.messages[3].source).toBe('API');
      expect(ast.messages[3].target).toBe('Client');
    });

    test('should infer participants from messages', () => {
      const ast = parse(`sequenceDiagram
    Client->>API: Request
    API->>Database: Query`);
      
      expect(ast.participants).toHaveLength(3);
      expect(ast.participants.map(p => p.id)).toContain('Client');
      expect(ast.participants.map(p => p.id)).toContain('API');
      expect(ast.participants.map(p => p.id)).toContain('Database');
    });

    test('should not duplicate declared participants', () => {
      const ast = parse(`sequenceDiagram
    participant Client
    participant API
    Client->>API: Request`);
      
      expect(ast.participants).toHaveLength(2);
    });

    test('should parse @sync annotation', () => {
      const ast = parse('Client->>API: Request @sync');
      
      expect(ast.messages[0].annotations.isAsync).toBe(false);
    });

    test('should parse @async annotation', () => {
      const ast = parse('API-->>Queue: Event @async');
      
      expect(ast.messages[0].annotations.isAsync).toBe(true);
    });

    test('should parse @path annotation with HTTP method', () => {
      const ast = parse('Client->>API: Create User @path(POST /api/users)');
      
      expect(ast.messages[0].annotations.method).toBe('POST');
      expect(ast.messages[0].annotations.path).toBe('/api/users');
    });

    test('should parse @type annotation', () => {
      const ast = parse('Client->>API: Request @type(JSON)');
      
      expect(ast.messages[0].annotations.requestType).toBe('JSON');
    });

    test('should parse @timeout annotation', () => {
      const ast = parse('API->>Service: Call @timeout(5000ms)');
      
      expect(ast.messages[0].annotations.timeout).toBe('5000ms');
    });

    test('should parse multiple annotations', () => {
      const ast = parse('Client->>API: Request @path(GET /api/users) @type(JSON) @sync');
      
      expect(ast.messages[0].annotations.method).toBe('GET');
      expect(ast.messages[0].annotations.path).toBe('/api/users');
      expect(ast.messages[0].annotations.requestType).toBe('JSON');
      expect(ast.messages[0].annotations.isAsync).toBe(false);
    });

    test('should parse complete diagram', () => {
      const source = `sequenceDiagram
    participant Client
    participant API as "API Gateway"
    participant DB as Database

    Client->>API: Create Order @path(POST /orders) @type(JSON)
    API->>DB: Save Order @sync
    DB-->>API: Order Saved
    API-->>Client: Order Created @async`;

      const ast = parse(source);
      
      expect(ast.participants).toHaveLength(3);
      expect(ast.messages).toHaveLength(4);
      
      expect(ast.participants[0].id).toBe('Client');
      expect(ast.participants[1].id).toBe('API');
      expect(ast.participants[1].displayName).toBe('API Gateway');
      expect(ast.participants[2].id).toBe('DB');
      expect(ast.participants[2].displayName).toBe('Database');
      
      expect(ast.messages[0].annotations.method).toBe('POST');
      expect(ast.messages[0].annotations.path).toBe('/orders');
      expect(ast.messages[1].annotations.isAsync).toBe(false);
      expect(ast.messages[3].annotations.isAsync).toBe(true);
    });
  });
});
