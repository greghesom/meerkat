/**
 * Token types for sequence diagram syntax
 */
export const TokenType = {
  // Standard tokens
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  ARROW: 'ARROW',
  NEWLINE: 'NEWLINE',
  COLON: 'COLON',
  AS: 'AS',

  // Extended tokens
  ANNOTATION: 'ANNOTATION',
  COMMENT: 'COMMENT',
  INIT_DIRECTIVE: 'INIT_DIRECTIVE',
  FLOW_DIRECTIVE: 'FLOW_DIRECTIVE',
};

/**
 * Arrow patterns for sequence diagrams
 */
const ARROW_PATTERNS = [
  '->>', // solid arrow with filled head
  '-->>',// dashed arrow with filled head
  '->',  // solid arrow with open head
  '-->',  // dashed arrow with open head
];

/**
 * Reserved keywords in sequence diagram syntax
 */
const KEYWORDS = [
  'sequenceDiagram',
  'participant',
  'actor',
  'Note',
  'over',
  'right',
  'left',
  'of',
  'title',
  'description',
];

/**
 * Lexer class for tokenizing diagram source
 */
export class Lexer {
  constructor(source) {
    this.source = source;
    this.position = 0;
    this.tokens = [];
  }

  /**
   * Tokenize the source and return array of tokens
   */
  tokenize() {
    while (this.position < this.source.length) {
      this.skipWhitespace();

      if (this.position >= this.source.length) break;

      // Check for comments
      if (this.match('%%')) {
        this.readComment();
        continue;
      }

      // Check for annotations (@path, @type, etc.)
      if (this.match('@')) {
        this.readAnnotation();
        continue;
      }

      // Check for arrows
      const arrow = this.matchArrow();
      if (arrow) {
        this.tokens.push({ type: TokenType.ARROW, value: arrow });
        this.position += arrow.length;
        continue;
      }

      // Check for colon
      if (this.current() === ':') {
        this.tokens.push({ type: TokenType.COLON, value: ':' });
        this.position++;
        continue;
      }

      // Check for newline
      if (this.current() === '\n') {
        this.tokens.push({ type: TokenType.NEWLINE });
        this.position++;
        continue;
      }

      // Check for quoted strings
      if (this.current() === '"' || this.current() === "'") {
        this.readString();
        continue;
      }

      // Check for identifiers/keywords
      if (this.isAlpha(this.current()) || this.current() === '_') {
        this.readIdentifier();
        continue;
      }

      // Skip unknown characters
      this.position++;
    }

    return this.tokens;
  }

  /**
   * Get current character
   */
  current() {
    return this.source[this.position];
  }

  /**
   * Check if we match a prefix at current position
   */
  match(prefix) {
    return this.source.slice(this.position, this.position + prefix.length) === prefix;
  }

  /**
   * Check if current position matches an arrow pattern
   */
  matchArrow() {
    for (const arrow of ARROW_PATTERNS) {
      if (this.match(arrow)) {
        return arrow;
      }
    }
    return null;
  }

  /**
   * Skip whitespace characters (except newlines)
   */
  skipWhitespace() {
    while (this.position < this.source.length) {
      const ch = this.current();
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.position++;
      } else {
        break;
      }
    }
  }

  /**
   * Check if character is alphabetic
   */
  isAlpha(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  }

  /**
   * Check if character is alphanumeric
   */
  isAlphaNumeric(ch) {
    return this.isAlpha(ch) || (ch >= '0' && ch <= '9') || ch === '_';
  }

  /**
   * Read a comment (lines starting with %%) or init directive %%{init: ...}%% or flow directive %%flow
   */
  readComment() {
    const start = this.position;
    this.position += 2; // skip %%

    // Check for init directive: %%{init: {...}}%%
    if (this.current() === '{') {
      return this.readInitDirective(start);
    }

    // Check for flow directive: %%flow flow_id "Display Name"
    if (this.match('flow ') || this.match('flow\t')) {
      return this.readFlowDirective();
    }

    while (this.position < this.source.length && this.current() !== '\n') {
      this.position++;
    }

    const content = this.source.slice(start + 2, this.position).trim();
    this.tokens.push({ type: TokenType.COMMENT, value: content });
  }

  /**
   * Read init directive %%{init: {...}}%%
   */
  readInitDirective(start) {
    // Find the closing }%%
    const endMarker = '}%%';
    let searchPos = this.position;
    let endPos = -1;
    
    while (searchPos < this.source.length) {
      const idx = this.source.indexOf(endMarker, searchPos);
      if (idx === -1) {
        break;
      }
      endPos = idx;
      break;
    }

    if (endPos === -1) {
      // No closing marker found, treat as regular comment
      while (this.position < this.source.length && this.current() !== '\n') {
        this.position++;
      }
      const content = this.source.slice(start + 2, this.position).trim();
      this.tokens.push({ type: TokenType.COMMENT, value: content });
      return;
    }

    // Extract the content between %%{ and }%%
    const content = this.source.slice(start + 3, endPos);
    this.position = endPos + 3; // move past }%%

    // Parse the init directive content
    this.parseInitDirective(content);
  }

  /**
   * Parse init directive content like: init: {"system": "Order Processing", "version": "1.0"}
   */
  parseInitDirective(content) {
    // Expected format: init: { ... }
    const initMatch = content.match(/^\s*init\s*:\s*(\{[\s\S]*\})\s*$/);
    if (!initMatch) {
      this.tokens.push({ type: TokenType.COMMENT, value: content });
      return;
    }

    try {
      // Parse the JSON object
      const jsonStr = initMatch[1];
      const config = JSON.parse(jsonStr);
      
      this.tokens.push({
        type: TokenType.INIT_DIRECTIVE,
        value: config,
      });
    } catch {
      // If JSON parsing fails, treat as comment
      this.tokens.push({ type: TokenType.COMMENT, value: content });
    }
  }

  /**
   * Read flow directive: %%flow flow_id "Display Name"
   * Parses flow definitions for multi-flow visualization
   */
  readFlowDirective() {
    this.position += 4; // skip 'flow' (the space or tab is handled by skipWhitespace)
    this.skipWhitespace();

    // Read flow identifier
    const idStart = this.position;
    while (this.position < this.source.length && this.isAlphaNumeric(this.current())) {
      this.position++;
    }
    const id = this.source.slice(idStart, this.position);

    if (!id) {
      // No valid identifier found, create a comment token with the malformed content
      const start = this.position;
      while (this.position < this.source.length && this.current() !== '\n') {
        this.position++;
      }
      const content = this.source.slice(start, this.position).trim();
      this.tokens.push({ type: TokenType.COMMENT, value: `flow ${content}`.trim() });
      return;
    }

    this.skipWhitespace();

    // Read display name (quoted string)
    let displayName = id; // Default to id if no display name provided
    if (this.current() === '"') {
      this.position++; // skip opening quote
      const nameStart = this.position;
      while (this.position < this.source.length && this.current() !== '"' && this.current() !== '\n') {
        this.position++;
      }
      displayName = this.source.slice(nameStart, this.position);
      if (this.current() === '"') {
        this.position++; // skip closing quote
      }
    }

    this.skipWhitespace();

    // Read optional color specification (hex, rgb, or named color)
    let color = null;
    if (this.current() === '#') {
      // Hex color: #RGB, #RRGGBB, or #RRGGBBAA
      color = this.readHexColor();
    } else if (this.match('rgb(')) {
      // RGB color: rgb(r, g, b)
      color = this.readRgbColor();
    } else if (this.match('rgba(')) {
      // RGBA color: rgba(r, g, b, a)
      color = this.readRgbColor();
    } else if (this.isAlpha(this.current())) {
      // Named color: red, blue, green, etc.
      color = this.readNamedColor();
    }

    // Skip to end of line
    while (this.position < this.source.length && this.current() !== '\n') {
      this.position++;
    }

    this.tokens.push({
      type: TokenType.FLOW_DIRECTIVE,
      id,
      displayName,
      color,
    });
  }

  /**
   * Read a hex color starting with #
   * Supports: #RGB, #RRGGBB, #RRGGBBAA
   */
  readHexColor() {
    const start = this.position;
    this.position++; // skip #
    while (this.position < this.source.length && this.isHexDigit(this.current())) {
      this.position++;
    }
    return this.source.slice(start, this.position);
  }

  /**
   * Check if character is a valid hex digit
   */
  isHexDigit(ch) {
    return (ch >= '0' && ch <= '9') || 
           (ch >= 'a' && ch <= 'f') || 
           (ch >= 'A' && ch <= 'F');
  }

  /**
   * Read an RGB or RGBA color
   * Supports: rgb(r, g, b) and rgba(r, g, b, a)
   */
  readRgbColor() {
    const start = this.position;
    // Read until closing parenthesis
    while (this.position < this.source.length && this.current() !== ')' && this.current() !== '\n') {
      this.position++;
    }
    if (this.current() === ')') {
      this.position++; // include closing paren
    }
    return this.source.slice(start, this.position);
  }

  /**
   * Read a named color (alphabetic characters only)
   */
  readNamedColor() {
    const start = this.position;
    while (this.position < this.source.length && this.isAlpha(this.current())) {
      this.position++;
    }
    return this.source.slice(start, this.position);
  }

  /**
   * Read annotation tokens like @path(GET /api/users), @sync, or @request{name: string}
   */
  readAnnotation() {
    this.position++; // skip @

    const nameStart = this.position;
    while (this.position < this.source.length && this.isAlphaNumeric(this.current())) {
      this.position++;
    }
    const name = this.source.slice(nameStart, this.position);

    let value = null;
    if (this.current() === '(') {
      this.position++; // skip (
      const valueStart = this.position;
      let depth = 1;
      while (depth > 0 && this.position < this.source.length) {
        if (this.current() === '(') depth++;
        if (this.current() === ')') depth--;
        if (depth > 0) this.position++;
      }
      value = this.source.slice(valueStart, this.position);
      this.position++; // skip )
    } else if (this.current() === '{') {
      // Support curly brace syntax for @request{} and @response{}
      this.position++; // skip {
      const valueStart = this.position;
      let depth = 1;
      while (depth > 0 && this.position < this.source.length) {
        if (this.current() === '{') depth++;
        if (this.current() === '}') depth--;
        if (depth > 0) this.position++;
      }
      value = this.source.slice(valueStart, this.position);
      this.position++; // skip }
    }

    this.tokens.push({
      type: TokenType.ANNOTATION,
      name,
      value,
    });
  }

  /**
   * Read a quoted string
   */
  readString() {
    const quote = this.current();
    this.position++; // skip opening quote

    const start = this.position;
    while (this.position < this.source.length && this.current() !== quote) {
      this.position++;
    }

    const value = this.source.slice(start, this.position);
    this.position++; // skip closing quote

    this.tokens.push({ type: TokenType.STRING, value });
  }

  /**
   * Read an identifier or keyword
   */
  readIdentifier() {
    const start = this.position;
    while (this.position < this.source.length && this.isAlphaNumeric(this.current())) {
      this.position++;
    }

    const value = this.source.slice(start, this.position);

    // Check if it's a keyword
    if (KEYWORDS.includes(value)) {
      this.tokens.push({ type: TokenType.KEYWORD, value });
    } else if (value.toLowerCase() === 'as') {
      this.tokens.push({ type: TokenType.AS, value });
    } else {
      this.tokens.push({ type: TokenType.IDENTIFIER, value });
    }
  }
}
