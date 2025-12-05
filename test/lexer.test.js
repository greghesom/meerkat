import { Lexer, TokenType } from '../src/core/parser/lexer.js';

describe('Lexer', () => {
  describe('tokenize', () => {
    test('should tokenize sequenceDiagram keyword', () => {
      const lexer = new Lexer('sequenceDiagram');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({ type: TokenType.KEYWORD, value: 'sequenceDiagram' });
    });

    test('should tokenize participant declaration', () => {
      const lexer = new Lexer('participant Client');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({ type: TokenType.KEYWORD, value: 'participant' });
      expect(tokens[1]).toEqual({ type: TokenType.IDENTIFIER, value: 'Client' });
    });

    test('should tokenize participant with alias', () => {
      const lexer = new Lexer('participant FE as Frontend');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toEqual({ type: TokenType.KEYWORD, value: 'participant' });
      expect(tokens[1]).toEqual({ type: TokenType.IDENTIFIER, value: 'FE' });
      expect(tokens[2]).toEqual({ type: TokenType.AS, value: 'as' });
      expect(tokens[3]).toEqual({ type: TokenType.IDENTIFIER, value: 'Frontend' });
    });

    test('should tokenize solid arrow with filled head', () => {
      const lexer = new Lexer('Client->>API');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'Client' });
      expect(tokens[1]).toEqual({ type: TokenType.ARROW, value: '->>' });
      expect(tokens[2]).toEqual({ type: TokenType.IDENTIFIER, value: 'API' });
    });

    test('should tokenize dashed arrow with filled head', () => {
      const lexer = new Lexer('API-->>Client');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'API' });
      expect(tokens[1]).toEqual({ type: TokenType.ARROW, value: '-->>' });
      expect(tokens[2]).toEqual({ type: TokenType.IDENTIFIER, value: 'Client' });
    });

    test('should tokenize solid arrow with open head', () => {
      const lexer = new Lexer('Client->API');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(3);
      expect(tokens[1]).toEqual({ type: TokenType.ARROW, value: '->' });
    });

    test('should tokenize dashed arrow with open head', () => {
      const lexer = new Lexer('Client-->API');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(3);
      expect(tokens[1]).toEqual({ type: TokenType.ARROW, value: '-->' });
    });

    test('should tokenize message with colon', () => {
      const lexer = new Lexer('Client->>API: Create Order');
      const tokens = lexer.tokenize();
      
      expect(tokens).toContainEqual({ type: TokenType.COLON, value: ':' });
      expect(tokens).toContainEqual({ type: TokenType.IDENTIFIER, value: 'Create' });
      expect(tokens).toContainEqual({ type: TokenType.IDENTIFIER, value: 'Order' });
    });

    test('should tokenize annotations', () => {
      const lexer = new Lexer('Client->>API: Request @sync');
      const tokens = lexer.tokenize();
      
      const annotation = tokens.find(t => t.type === TokenType.ANNOTATION);
      expect(annotation).toEqual({ type: TokenType.ANNOTATION, name: 'sync', value: null });
    });

    test('should tokenize @async annotation', () => {
      const lexer = new Lexer('API-->>Queue: Event @async');
      const tokens = lexer.tokenize();
      
      const annotation = tokens.find(t => t.type === TokenType.ANNOTATION);
      expect(annotation).toEqual({ type: TokenType.ANNOTATION, name: 'async', value: null });
    });

    test('should tokenize @queue annotation with value', () => {
      const lexer = new Lexer('@queue(user-events)');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'queue',
        value: 'user-events',
      });
    });

    test('should tokenize @timeout annotation with value', () => {
      const lexer = new Lexer('@timeout(100ms)');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'timeout',
        value: '100ms',
      });
    });

    test('should tokenize annotations with values', () => {
      const lexer = new Lexer('@path(GET /api/users)');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'path',
        value: 'GET /api/users',
      });
    });

    test('should tokenize @request annotation with curly braces', () => {
      const lexer = new Lexer('@request{name: string, email: string}');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'request',
        value: 'name: string, email: string',
      });
    });

    test('should tokenize @response annotation with curly braces', () => {
      const lexer = new Lexer('@response{id: uuid, created_at: timestamp}');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'response',
        value: 'id: uuid, created_at: timestamp',
      });
    });

    test('should tokenize @request with URL reference', () => {
      const lexer = new Lexer('@request{https://api.example.com/schemas/user}');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'request',
        value: 'https://api.example.com/schemas/user',
      });
    });

    test('should tokenize @response with anchor reference', () => {
      const lexer = new Lexer('@response{#UserResponse}');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'response',
        value: '#UserResponse',
      });
    });

    test('should tokenize @request with nested curly braces', () => {
      const lexer = new Lexer('@request{user: {name: string}}');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: TokenType.ANNOTATION,
        name: 'request',
        value: 'user: {name: string}',
      });
    });

    test('should tokenize comments', () => {
      const lexer = new Lexer('%% This is a comment');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
      expect(tokens[0].value).toBe('This is a comment');
    });

    test('should tokenize multiline input', () => {
      const source = `sequenceDiagram
    Client->>API: Request
    API-->>Client: Response`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      const keywords = tokens.filter(t => t.type === TokenType.KEYWORD);
      expect(keywords).toHaveLength(1);
      expect(keywords[0].value).toBe('sequenceDiagram');

      const arrows = tokens.filter(t => t.type === TokenType.ARROW);
      expect(arrows).toHaveLength(2);
      expect(arrows[0].value).toBe('->>');
      expect(arrows[1].value).toBe('-->>');
    });

    test('should tokenize quoted strings', () => {
      const lexer = new Lexer('participant FE as "Frontend App"');
      const tokens = lexer.tokenize();
      
      const stringToken = tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken).toEqual({ type: TokenType.STRING, value: 'Frontend App' });
    });

    test('should tokenize description keyword', () => {
      const lexer = new Lexer('description: Order flow handling');
      const tokens = lexer.tokenize();
      
      expect(tokens[0]).toEqual({ type: TokenType.KEYWORD, value: 'description' });
    });

    test('should tokenize init directive with system and version', () => {
      const source = '%%{init: {"system": "Order Processing", "version": "1.0.0"}}%%';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.INIT_DIRECTIVE);
      expect(tokens[0].value).toEqual({
        system: 'Order Processing',
        version: '1.0.0'
      });
    });

    test('should tokenize init directive with only system', () => {
      const source = '%%{init: {"system": "My System"}}%%';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.INIT_DIRECTIVE);
      expect(tokens[0].value).toEqual({ system: 'My System' });
    });

    test('should tokenize init directive with only version', () => {
      const source = '%%{init: {"version": "2.0.0"}}%%';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.INIT_DIRECTIVE);
      expect(tokens[0].value).toEqual({ version: '2.0.0' });
    });

    test('should handle malformed init directive as comment', () => {
      const source = '%%{init: not valid json}%%';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
    });

    test('should handle init directive without closing marker as comment', () => {
      const source = '%%{init: {"system": "Test"}';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
    });

    test('should tokenize flow directive with id and display name', () => {
      const source = '%%flow happy_path "Happy Path - Successful Order"';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.FLOW_DIRECTIVE);
      expect(tokens[0].id).toBe('happy_path');
      expect(tokens[0].displayName).toBe('Happy Path - Successful Order');
    });

    test('should tokenize flow directive with only id', () => {
      const source = '%%flow error_flow';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.FLOW_DIRECTIVE);
      expect(tokens[0].id).toBe('error_flow');
      expect(tokens[0].displayName).toBe('error_flow');
    });

    test('should tokenize multiple flow directives', () => {
      const source = `%%flow happy_path "Happy Path"
%%flow error_flow "Error Flow"
%%flow retry_flow "Retry Flow"`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      const flowTokens = tokens.filter(t => t.type === TokenType.FLOW_DIRECTIVE);
      expect(flowTokens).toHaveLength(3);
      expect(flowTokens[0].id).toBe('happy_path');
      expect(flowTokens[1].id).toBe('error_flow');
      expect(flowTokens[2].id).toBe('retry_flow');
    });

    test('should tokenize flow directive with underscore in id', () => {
      const source = '%%flow my_custom_flow "My Custom Flow"';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.FLOW_DIRECTIVE);
      expect(tokens[0].id).toBe('my_custom_flow');
    });

    test('should tokenize flow directive with numbers in id', () => {
      const source = '%%flow flow1 "Flow 1"';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.FLOW_DIRECTIVE);
      expect(tokens[0].id).toBe('flow1');
    });

    test('should handle flow directive with tab separator', () => {
      const source = '%%flow\thappy_path "Happy Path"';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.FLOW_DIRECTIVE);
      expect(tokens[0].id).toBe('happy_path');
    });

    test('should tokenize flow directives in full diagram', () => {
      const source = `sequenceDiagram
    %%flow happy_path "Happy Path - Successful Order"
    %%flow error_flow "Error Flow - Payment Failed"
    
    participant Client
    participant API`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      const flowTokens = tokens.filter(t => t.type === TokenType.FLOW_DIRECTIVE);
      expect(flowTokens).toHaveLength(2);
      expect(flowTokens[0].id).toBe('happy_path');
      expect(flowTokens[0].displayName).toBe('Happy Path - Successful Order');
      expect(flowTokens[1].id).toBe('error_flow');
      expect(flowTokens[1].displayName).toBe('Error Flow - Payment Failed');
    });

    test('should handle malformed flow directive as comment', () => {
      const source = '%%flow';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
      expect(tokens[0].value).toBe('flow');
    });

    test('should handle flow directive with only whitespace after flow as comment', () => {
      const source = '%%flow   ';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
    });
  });
});
