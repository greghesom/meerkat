import { TokenType } from './lexer.js';

/**
 * AST Node types
 */
export const NodeType = {
  DIAGRAM: 'DIAGRAM',
  PARTICIPANT: 'PARTICIPANT',
  MESSAGE: 'MESSAGE',
  NOTE: 'NOTE',
};

/**
 * Parser class - builds AST from tokens
 */
export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  /**
   * Parse tokens and build AST
   */
  parse() {
    const diagram = {
      type: NodeType.DIAGRAM,
      title: '',
      participants: [],
      messages: [],
    };

    while (this.position < this.tokens.length) {
      const token = this.current();

      if (!token) break;

      switch (token.type) {
        case TokenType.KEYWORD:
          if (token.value === 'participant' || token.value === 'actor') {
            diagram.participants.push(this.parseParticipant());
          } else if (token.value === 'sequenceDiagram') {
            this.position++;
          } else if (token.value === 'title') {
            diagram.title = this.parseTitle();
          } else {
            this.position++;
          }
          break;

        case TokenType.IDENTIFIER:
          // Could be start of a message
          const message = this.tryParseMessage();
          if (message) {
            diagram.messages.push(message);
          }
          break;

        case TokenType.COMMENT:
        case TokenType.NEWLINE:
          this.position++;
          break;

        default:
          this.position++;
      }
    }

    // Auto-detect participants from messages if not declared
    this.inferParticipants(diagram);

    return diagram;
  }

  /**
   * Get current token
   */
  current() {
    return this.tokens[this.position];
  }

  /**
   * Peek at next token
   */
  peek(offset = 1) {
    return this.tokens[this.position + offset];
  }

  /**
   * Parse a participant declaration
   */
  parseParticipant() {
    this.position++; // skip 'participant' keyword

    const idToken = this.current();
    if (!idToken || idToken.type !== TokenType.IDENTIFIER) {
      throw new Error('Expected participant identifier');
    }
    this.position++;

    let displayName = idToken.value;
    let type = 'default';

    // Check for 'as' alias
    if (this.current()?.type === TokenType.AS) {
      this.position++; // skip 'as'

      const aliasToken = this.current();
      if (aliasToken?.type === TokenType.IDENTIFIER) {
        displayName = aliasToken.value;
        this.position++;
      } else if (aliasToken?.type === TokenType.STRING) {
        displayName = aliasToken.value;
        this.position++;
      }
    }

    // Skip to end of line
    while (this.current() && this.current().type !== TokenType.NEWLINE) {
      this.position++;
    }

    return {
      type: NodeType.PARTICIPANT,
      id: idToken.value,
      displayName,
      participantType: type,
    };
  }

  /**
   * Parse title
   */
  parseTitle() {
    this.position++; // skip 'title'

    // Skip colon if present
    if (this.current()?.type === TokenType.COLON) {
      this.position++;
    }

    let title = '';
    if (this.current()?.type === TokenType.IDENTIFIER) {
      title = this.current().value;
      this.position++;
    } else if (this.current()?.type === TokenType.STRING) {
      title = this.current().value;
      this.position++;
    }

    return title;
  }

  /**
   * Try to parse a message from current position
   */
  tryParseMessage() {
    const sourceToken = this.current();
    if (sourceToken.type !== TokenType.IDENTIFIER) {
      return null;
    }

    // Look ahead for arrow
    const nextToken = this.peek();
    if (!nextToken || nextToken.type !== TokenType.ARROW) {
      this.position++;
      return null;
    }

    // Parse message
    const source = sourceToken.value;
    this.position++; // move to arrow

    const arrowToken = this.current();
    this.position++; // move past arrow

    // Get target
    const targetToken = this.current();
    if (!targetToken || targetToken.type !== TokenType.IDENTIFIER) {
      return null;
    }
    const target = targetToken.value;
    this.position++;

    // Skip colon if present
    if (this.current()?.type === TokenType.COLON) {
      this.position++;
    }

    // Read message text (identifiers until annotation or newline)
    let text = '';
    while (
      this.current() &&
      this.current().type !== TokenType.ANNOTATION &&
      this.current().type !== TokenType.NEWLINE
    ) {
      if (this.current().type === TokenType.IDENTIFIER || 
          this.current().type === TokenType.STRING) {
        text += (text ? ' ' : '') + this.current().value;
      }
      this.position++;
    }

    // Parse annotations
    const annotations = this.parseAnnotations();

    return {
      type: NodeType.MESSAGE,
      source,
      target,
      text: text.trim(),
      arrow: this.parseArrowType(arrowToken.value),
      annotations,
    };
  }

  /**
   * Parse annotations attached to a message
   */
  parseAnnotations() {
    const annotations = {
      path: null,
      method: null,
      requestType: null,
      isAsync: false,
      timeout: null,
      flows: [],
    };

    while (this.current()?.type === TokenType.ANNOTATION) {
      const annotation = this.current();

      switch (annotation.name) {
        case 'path':
          const pathMatch = annotation.value?.match(
            /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)?\s*(.+)$/i
          );
          if (pathMatch) {
            annotations.method = pathMatch[1]?.toUpperCase() || null;
            annotations.path = pathMatch[2].trim();
          } else if (annotation.value) {
            annotations.path = annotation.value;
          }
          break;

        case 'type':
          annotations.requestType = annotation.value?.toUpperCase() || null;
          break;

        case 'sync':
          annotations.isAsync = false;
          break;

        case 'async':
          annotations.isAsync = true;
          break;

        case 'timeout':
          annotations.timeout = annotation.value;
          break;

        case 'flow':
          annotations.flows = annotation.value?.split(',').map((f) => f.trim()) || [];
          break;
      }

      this.position++;
    }

    return annotations;
  }

  /**
   * Determine arrow type from arrow string
   */
  parseArrowType(arrow) {
    return {
      line: arrow.includes('--') ? 'dashed' : 'solid',
      head: arrow.includes('>>') ? 'filled' : 'open',
    };
  }

  /**
   * Infer participants from message sources and targets
   */
  inferParticipants(diagram) {
    const declaredIds = new Set(diagram.participants.map((p) => p.id));
    const inferredIds = new Set();

    for (const message of diagram.messages) {
      if (!declaredIds.has(message.source) && !inferredIds.has(message.source)) {
        inferredIds.add(message.source);
        diagram.participants.push({
          type: NodeType.PARTICIPANT,
          id: message.source,
          displayName: message.source,
          participantType: 'default',
        });
      }
      if (!declaredIds.has(message.target) && !inferredIds.has(message.target)) {
        inferredIds.add(message.target);
        diagram.participants.push({
          type: NodeType.PARTICIPANT,
          id: message.target,
          displayName: message.target,
          participantType: 'default',
        });
      }
    }
  }
}
