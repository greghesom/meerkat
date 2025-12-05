# Sequence Diagram Visualizer

A powerful interactive sequence diagram tool with extended Mermaid syntax for visualizing architectural flows, API interactions, and multi-path scenarios.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Extended Mermaid Syntax** - Define API paths, request types, sync/async behaviors
- **Multi-Flow Support** - Visualize multiple scenarios with color-coded paths
- **Interactive Timeline** - Scrub through sequences step-by-step
- **Live Editor** - Real-time preview with syntax highlighting
- **Export Options** - PNG, SVG, shareable URLs

## Table of Contents

- [Quick Start](#quick-start)
- [Extended Syntax Reference](#extended-syntax-reference)
- [Architecture](#architecture)
- [Technical Implementation](#technical-implementation)
- [Component Reference](#component-reference)
- [API Documentation](#api-documentation)
- [Styling Guide](#styling-guide)
- [Contributing](#contributing)

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/sequence-diagram-visualizer.git
cd sequence-diagram-visualizer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Basic Usage

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sequence Diagram Visualizer</title>
    <link rel="stylesheet" href="dist/sequence-visualizer.css" />
  </head>
  <body>
    <div id="diagram-container"></div>

    <script src="dist/sequence-visualizer.js"></script>
    <script>
      const diagram = new SequenceVisualizer("#diagram-container", {
        theme: "light",
        showTimeline: true,
        showEditor: true,
      });

      diagram.render(`
      sequenceDiagram
        title: Order Processing Flow
        Client->>API: Create Order @path(POST /orders) @type(JSON)
        API->>Database: Save Order @sync
        API-->>Client: Order Created
    `);
    </script>
  </body>
</html>
```

---

## Extended Syntax Reference

### System Metadata

Define system-level information at the start of your diagram:

```
%%{init: {
  "system": "Order Management Service",
  "version": "2.1.0",
  "author": "Architecture Team"
}}%%
sequenceDiagram
    title: Order Checkout Flow
    description: Complete order processing including payment and fulfillment
```

### Participant Definitions

```
sequenceDiagram
    %% Standard participant
    participant FE as Frontend

    %% Participant with system type
    participant API as "API Gateway" %% type: gateway
    participant DB as "PostgreSQL" %% type: database
    participant Q as "RabbitMQ" %% type: queue
    participant EXT as "Stripe API" %% type: external
```

### Message Annotations

#### API Path (`@path`)

```
%% HTTP REST endpoints
Client->>API: Get Products @path(GET /api/v1/products)
Client->>API: Create User @path(POST /api/v1/users)
Client->>API: Update User @path(PUT /api/v1/users/{id})
Client->>API: Delete User @path(DELETE /api/v1/users/{id})

%% SAP RFC
API->>SAP: Create Order @path(BAPI_SALESORDER_CREATEFROMDAT2)

%% SOAP endpoints
API->>Legacy: Get Customer @path(/services/CustomerService.asmx?op=GetCustomer)
```

#### Request Type (`@type`)

```
%% Supported types: JSON, SOAP, XML, RFC_SAP, GraphQL, gRPC, BINARY, CUSTOM

Client->>API: REST Call @type(JSON)
API->>SAP: RFC Call @type(RFC_SAP)
API->>Legacy: SOAP Call @type(SOAP)
Client->>API: Query Data @type(GraphQL)
Service->>Service: Internal Call @type(gRPC)
API->>Storage: Upload File @type(BINARY)
```

#### Sync/Async Indicators

```
%% Synchronous (blocking) call
API->>Database: Query User @sync @timeout(100ms)

%% Asynchronous (non-blocking) call
API-->>Queue: Publish Event @async @queue(order-events)

%% Async with callback
API-->>Worker: Process Job @async @callback(POST /webhooks/complete)
```

#### Combined Annotations

```
Client->>API: Create Order @path(POST /api/orders) @type(JSON) @sync @timeout(5000ms)
API-->>Queue: Order Event @path(order.created) @type(JSON) @async @queue(order-events)
```

### Payload Annotations

```
sequenceDiagram
    Client->>+API: Create User @path(POST /users) @type(JSON)
    Note right of API: @request{name: string, email: string, role?: string}

    API->>+DB: Insert User @sync
    Note right of DB: @query{INSERT INTO users (name, email) VALUES ($1, $2)}
    DB-->>-API: User Record

    API-->>-Client: User Created
    Note left of Client: @response{id: uuid, name: string, created_at: timestamp}
```

### Flow Definitions

```
sequenceDiagram
    %% Define flows with name, display label, and color
    %%flow happy "Happy Path" #22C55E
    %%flow error "Error - Payment Failed" #EF4444
    %%flow retry "Retry Flow" #F59E0B
    %%flow timeout "Timeout Scenario" #8B5CF6

    participant Client
    participant API
    participant Payment
    participant DB

    %% Shared step (all flows)
    Client->>API: Submit Order @flow(happy, error, retry, timeout)

    %% Happy path
    API->>Payment: Process Payment @flow(happy)
    Payment-->>API: Payment Success @flow(happy)
    API->>DB: Save Order @flow(happy)
    API-->>Client: Order Confirmed @flow(happy)

    %% Error flow
    API->>Payment: Process Payment @flow(error)
    Payment-->>API: Payment Failed @flow(error)
    API-->>Client: Payment Error @flow(error)

    %% Retry flow
    API->>Payment: Process Payment @flow(retry)
    Payment-->>API: Payment Failed @flow(retry)
    API->>Payment: Retry Payment @flow(retry)
    Payment-->>API: Payment Success @flow(retry)
    API-->>Client: Order Confirmed (Retry) @flow(retry)

    %% Timeout flow
    API->>Payment: Process Payment @flow(timeout) @timeout(5000ms)
    Note right of Payment: Request times out @flow(timeout)
    API-->>Client: Service Unavailable @flow(timeout)
```

---

## Architecture

```
src/
├── core/
│   ├── parser/
│   │   ├── lexer.js           # Tokenizes extended syntax
│   │   ├── parser.js          # Builds AST from tokens
│   │   └── transformer.js     # Transforms AST to render model
│   ├── renderer/
│   │   ├── svg-renderer.js    # SVG generation
│   │   ├── participants.js    # Participant box rendering
│   │   ├── messages.js        # Arrow and label rendering
│   │   └── animations.js      # Timeline animations
│   └── state/
│       ├── store.js           # Central state management
│       ├── timeline.js        # Timeline state
│       └── flows.js           # Flow visibility state
├── components/
│   ├── Editor/
│   │   ├── Editor.js          # Monaco/CodeMirror wrapper
│   │   ├── syntax.js          # Syntax highlighting rules
│   │   └── autocomplete.js    # Completion provider
│   ├── Timeline/
│   │   ├── Timeline.js        # Timeline slider component
│   │   ├── Controls.js        # Play/pause/step buttons
│   │   └── StepDetails.js     # Current step info panel
│   ├── FlowLegend/
│   │   └── FlowLegend.js      # Flow toggle controls
│   └── Toolbar/
│       └── Toolbar.js         # Export, theme, zoom controls
├── utils/
│   ├── colors.js              # Color utilities
│   ├── export.js              # PNG/SVG export
│   └── url.js                 # URL encoding/sharing
└── index.js                   # Main entry point
```

---

## Technical Implementation

### 1. Parser Implementation

The parser transforms extended Mermaid syntax into a structured AST.

```javascript
// src/core/parser/lexer.js

/**
 * Token types for extended sequence diagram syntax
 */
const TokenType = {
  // Standard tokens
  KEYWORD: "KEYWORD",
  IDENTIFIER: "IDENTIFIER",
  STRING: "STRING",
  ARROW: "ARROW",
  NEWLINE: "NEWLINE",

  // Extended tokens
  ANNOTATION: "ANNOTATION", // @path, @type, @sync, etc.
  FLOW_DEF: "FLOW_DEF", // %%flow
  INIT_BLOCK: "INIT_BLOCK", // %%{init: ...}%%
  COMMENT: "COMMENT",
};

/**
 * Lexer class for tokenizing diagram source
 */
class Lexer {
  constructor(source) {
    this.source = source;
    this.position = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.position < this.source.length) {
      this.skipWhitespace();

      if (this.match("%%{init:")) {
        this.readInitBlock();
      } else if (this.match("%%flow")) {
        this.readFlowDefinition();
      } else if (this.match("%%")) {
        this.readComment();
      } else if (this.match("@")) {
        this.readAnnotation();
      } else if (this.matchArrow()) {
        this.readArrow();
      } else if (this.matchKeyword()) {
        this.readKeyword();
      } else if (this.match('"') || this.match("'")) {
        this.readString();
      } else if (this.matchIdentifier()) {
        this.readIdentifier();
      } else if (this.match("\n")) {
        this.tokens.push({ type: TokenType.NEWLINE });
        this.position++;
      } else {
        this.position++;
      }
    }

    return this.tokens;
  }

  /**
   * Read annotation tokens like @path(GET /api/users)
   */
  readAnnotation() {
    this.position++; // skip @

    const nameStart = this.position;
    while (this.isAlphaNumeric(this.current())) {
      this.position++;
    }
    const name = this.source.slice(nameStart, this.position);

    let value = null;
    if (this.current() === "(") {
      this.position++; // skip (
      const valueStart = this.position;
      let depth = 1;
      while (depth > 0 && this.position < this.source.length) {
        if (this.current() === "(") depth++;
        if (this.current() === ")") depth--;
        if (depth > 0) this.position++;
      }
      value = this.source.slice(valueStart, this.position);
      this.position++; // skip )
    }

    this.tokens.push({
      type: TokenType.ANNOTATION,
      name,
      value,
    });
  }

  /**
   * Read flow definition: %%flow flow_id "Display Name" #color
   */
  readFlowDefinition() {
    this.position += 6; // skip %%flow
    this.skipWhitespace();

    // Read flow ID
    const idStart = this.position;
    while (this.isAlphaNumeric(this.current()) || this.current() === "_") {
      this.position++;
    }
    const id = this.source.slice(idStart, this.position);

    this.skipWhitespace();

    // Read display name (quoted string)
    let displayName = id;
    if (this.current() === '"') {
      this.position++;
      const nameStart = this.position;
      while (this.current() !== '"' && this.position < this.source.length) {
        this.position++;
      }
      displayName = this.source.slice(nameStart, this.position);
      this.position++; // skip closing quote
    }

    this.skipWhitespace();

    // Read color (optional)
    let color = null;
    if (this.current() === "#") {
      const colorStart = this.position;
      this.position++;
      while (this.isHexChar(this.current())) {
        this.position++;
      }
      color = this.source.slice(colorStart, this.position);
    }

    this.tokens.push({
      type: TokenType.FLOW_DEF,
      id,
      displayName,
      color,
    });
  }

  // ... additional lexer methods
}

export { Lexer, TokenType };
```

```javascript
// src/core/parser/parser.js

import { TokenType } from "./lexer.js";

/**
 * AST Node types
 */
const NodeType = {
  DIAGRAM: "DIAGRAM",
  PARTICIPANT: "PARTICIPANT",
  MESSAGE: "MESSAGE",
  NOTE: "NOTE",
  FLOW: "FLOW",
  GROUP: "GROUP",
};

/**
 * Parser class - builds AST from tokens
 */
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  parse() {
    const diagram = {
      type: NodeType.DIAGRAM,
      metadata: {},
      flows: [],
      participants: [],
      messages: [],
    };

    while (this.position < this.tokens.length) {
      const token = this.current();

      switch (token.type) {
        case TokenType.INIT_BLOCK:
          diagram.metadata = this.parseMetadata(token);
          break;

        case TokenType.FLOW_DEF:
          diagram.flows.push(this.parseFlowDefinition(token));
          break;

        case TokenType.KEYWORD:
          if (token.value === "participant" || token.value === "actor") {
            diagram.participants.push(this.parseParticipant());
          } else if (token.value === "Note") {
            diagram.messages.push(this.parseNote());
          }
          break;

        case TokenType.IDENTIFIER:
          // Could be start of a message
          const message = this.parseMessage();
          if (message) {
            diagram.messages.push(message);
          }
          break;

        default:
          this.position++;
      }
    }

    // Auto-detect participants from messages if not declared
    this.inferParticipants(diagram);

    // Assign default colors to flows without colors
    this.assignFlowColors(diagram);

    return diagram;
  }

  /**
   * Parse a message with annotations
   */
  parseMessage() {
    const source = this.expect(TokenType.IDENTIFIER).value;
    const arrow = this.expect(TokenType.ARROW);
    const target = this.expect(TokenType.IDENTIFIER).value;

    // Skip colon if present
    this.skipIf(":");

    // Read message text until annotation or newline
    let text = "";
    while (
      this.current() &&
      this.current().type !== TokenType.ANNOTATION &&
      this.current().type !== TokenType.NEWLINE
    ) {
      text += this.current().value || "";
      this.position++;
    }

    // Parse annotations
    const annotations = this.parseAnnotations();

    return {
      type: NodeType.MESSAGE,
      source,
      target,
      text: text.trim(),
      arrow: this.parseArrowType(arrow),
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
      queue: null,
      flows: [],
      callback: null,
    };

    while (this.current()?.type === TokenType.ANNOTATION) {
      const annotation = this.current();

      switch (annotation.name) {
        case "path":
          const pathMatch = annotation.value.match(
            /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)?\s*(.+)$/i
          );
          if (pathMatch) {
            annotations.method = pathMatch[1]?.toUpperCase() || null;
            annotations.path = pathMatch[2].trim();
          } else {
            annotations.path = annotation.value;
          }
          break;

        case "type":
          annotations.requestType = annotation.value.toUpperCase();
          break;

        case "sync":
          annotations.isAsync = false;
          break;

        case "async":
          annotations.isAsync = true;
          break;

        case "timeout":
          annotations.timeout = annotation.value;
          break;

        case "queue":
          annotations.queue = annotation.value;
          annotations.isAsync = true;
          break;

        case "flow":
          annotations.flows = annotation.value.split(",").map((f) => f.trim());
          break;

        case "callback":
          annotations.callback = annotation.value;
          break;
      }

      this.position++;
    }

    return annotations;
  }

  /**
   * Determine arrow type from token
   */
  parseArrowType(arrowToken) {
    const arrow = arrowToken.value;
    return {
      line: arrow.includes("--") ? "dashed" : "solid",
      head: arrow.includes(">>") ? "filled" : "open",
      activation: arrow.includes("+")
        ? "start"
        : arrow.includes("-")
        ? "end"
        : null,
    };
  }

  // ... additional parser methods
}

export { Parser, NodeType };
```

### 2. Renderer Implementation

```javascript
// src/core/renderer/svg-renderer.js

/**
 * SVG Renderer for sequence diagrams
 */
class SVGRenderer {
  constructor(container, options = {}) {
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    this.options = {
      width: options.width || "auto",
      height: options.height || "auto",
      padding: options.padding || 20,
      participantGap: options.participantGap || 150,
      messageGap: options.messageGap || 50,
      participantWidth: options.participantWidth || 120,
      participantHeight: options.participantHeight || 40,
      theme: options.theme || "light",
      ...options,
    };

    this.svg = null;
    this.defs = null;
  }

  /**
   * Render the complete diagram
   */
  render(ast, state = {}) {
    // Calculate dimensions
    const dimensions = this.calculateDimensions(ast);

    // Create SVG element
    this.svg = this.createSVG(dimensions);
    this.defs = this.createDefs();

    // Create groups for layering
    const layers = {
      lifelines: this.createGroup("lifelines"),
      activations: this.createGroup("activations"),
      messages: this.createGroup("messages"),
      labels: this.createGroup("labels"),
      annotations: this.createGroup("annotations"),
    };

    // Render participants
    const participantPositions = this.renderParticipants(
      ast.participants,
      layers
    );

    // Render messages with flow colors
    this.renderMessages(
      ast.messages,
      participantPositions,
      ast.flows,
      layers,
      state
    );

    // Render lifelines
    this.renderLifelines(participantPositions, dimensions.height, layers);

    // Clear and append to container
    this.container.innerHTML = "";
    this.container.appendChild(this.svg);

    return this.svg;
  }

  /**
   * Create the main SVG element
   */
  createSVG(dimensions) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", dimensions.width);
    svg.setAttribute("height", dimensions.height);
    svg.setAttribute("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.setAttribute("class", `sequence-diagram theme-${this.options.theme}`);
    return svg;
  }

  /**
   * Create SVG defs for markers, gradients, etc.
   */
  createDefs() {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    // Arrow markers for different flow colors
    const defaultColors = [
      "#333333",
      "#22C55E",
      "#EF4444",
      "#F59E0B",
      "#8B5CF6",
      "#3B82F6",
    ];
    defaultColors.forEach((color, index) => {
      defs.appendChild(this.createArrowMarker(`arrow-${index}`, color));
      defs.appendChild(
        this.createArrowMarker(`arrow-${index}-open`, color, true)
      );
    });

    // Async indicator pattern
    defs.appendChild(this.createAsyncPattern());

    this.svg.appendChild(defs);
    return defs;
  }

  /**
   * Create arrow marker definition
   */
  createArrowMarker(id, color, open = false) {
    const marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "marker"
    );
    marker.setAttribute("id", id);
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      open ? "M 0 0 L 10 5 L 0 10" : "M 0 0 L 10 5 L 0 10 z"
    );
    path.setAttribute("fill", open ? "none" : color);
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1");

    marker.appendChild(path);
    return marker;
  }

  /**
   * Render participant boxes
   */
  renderParticipants(participants, layers) {
    const positions = new Map();
    const { padding, participantGap, participantWidth, participantHeight } =
      this.options;

    participants.forEach((participant, index) => {
      const x = padding + index * participantGap;
      const y = padding;

      // Store center position for message routing
      positions.set(participant.id, {
        x: x + participantWidth / 2,
        y: y + participantHeight,
        index,
      });

      // Create participant group
      const group = this.createGroup(`participant-${participant.id}`);

      // Background rect
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", participantWidth);
      rect.setAttribute("height", participantHeight);
      rect.setAttribute("rx", "4");
      rect.setAttribute(
        "class",
        `participant-box ${participant.type || "default"}`
      );

      // Label
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", x + participantWidth / 2);
      text.setAttribute("y", y + participantHeight / 2);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("class", "participant-label");
      text.textContent = participant.displayName || participant.id;

      group.appendChild(rect);
      group.appendChild(text);
      layers.labels.appendChild(group);
    });

    return positions;
  }

  /**
   * Render messages with flow-specific styling
   */
  renderMessages(messages, positions, flows, layers, state) {
    const { padding, participantHeight, messageGap } = this.options;
    const startY = padding + participantHeight + 30;

    // Build flow color map
    const flowColors = new Map();
    flows.forEach((flow, index) => {
      flowColors.set(flow.id, {
        color: flow.color || this.getDefaultColor(index),
        index,
      });
    });

    messages.forEach((message, index) => {
      const y = startY + index * messageGap;
      const sourcePos = positions.get(message.source);
      const targetPos = positions.get(message.target);

      if (!sourcePos || !targetPos) return;

      // Determine visibility based on timeline state
      const isVisible = this.isMessageVisible(message, index, state);
      const isCurrent = state.currentStep === index;
      const isPast = state.currentStep > index;

      // Determine flow colors for this message
      const messageFlows = message.annotations.flows;
      const activeFlows = messageFlows.filter(
        (f) => !state.hiddenFlows?.includes(f)
      );

      if (activeFlows.length === 0 && messageFlows.length > 0) {
        return; // All flows hidden
      }

      // Get primary color (first active flow or default)
      const primaryFlow = activeFlows[0];
      const flowStyle = primaryFlow
        ? flowColors.get(primaryFlow)
        : { color: "#333333", index: 0 };

      // Create message group
      const group = this.createGroup(`message-${index}`);
      group.setAttribute(
        "class",
        `message ${isVisible ? "" : "hidden"} ${isCurrent ? "current" : ""} ${
          isPast ? "past" : ""
        }`
      );

      // Draw arrow line
      const line = this.createMessageLine(
        sourcePos,
        targetPos,
        y,
        message,
        flowStyle
      );
      group.appendChild(line);

      // Draw message label
      const label = this.createMessageLabel(
        sourcePos,
        targetPos,
        y,
        message,
        flowStyle
      );
      group.appendChild(label);

      // Draw annotation badges
      if (message.annotations.path || message.annotations.requestType) {
        const badges = this.createAnnotationBadges(
          sourcePos,
          targetPos,
          y,
          message
        );
        group.appendChild(badges);
      }

      layers.messages.appendChild(group);
    });
  }

  /**
   * Create the message line/arrow
   */
  createMessageLine(sourcePos, targetPos, y, message, flowStyle) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", sourcePos.x);
    line.setAttribute("y1", y);
    line.setAttribute("x2", targetPos.x);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", flowStyle.color);
    line.setAttribute("stroke-width", "2");

    // Dashed line for async
    if (message.annotations.isAsync || message.arrow.line === "dashed") {
      line.setAttribute("stroke-dasharray", "5,3");
    }

    // Arrow marker
    const markerType = message.arrow.head === "open" ? "-open" : "";
    line.setAttribute(
      "marker-end",
      `url(#arrow-${flowStyle.index}${markerType})`
    );

    return line;
  }

  /**
   * Create message label
   */
  createMessageLabel(sourcePos, targetPos, y, message, flowStyle) {
    const midX = (sourcePos.x + targetPos.x) / 2;

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", midX);
    text.setAttribute("y", y - 8);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "message-label");
    text.setAttribute("fill", flowStyle.color);
    text.textContent = message.text;

    return text;
  }

  /**
   * Create annotation badges (method, type, async)
   */
  createAnnotationBadges(sourcePos, targetPos, y, message) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const midX = (sourcePos.x + targetPos.x) / 2;
    let badgeX = midX - 60;

    const { annotations } = message;

    // HTTP method badge
    if (annotations.method) {
      const badge = this.createBadge(
        badgeX,
        y + 5,
        annotations.method,
        this.getMethodColor(annotations.method)
      );
      group.appendChild(badge);
      badgeX += 45;
    }

    // Request type badge
    if (annotations.requestType) {
      const badge = this.createBadge(
        badgeX,
        y + 5,
        annotations.requestType,
        "#6B7280"
      );
      group.appendChild(badge);
      badgeX += 50;
    }

    // Async indicator
    if (annotations.isAsync) {
      const badge = this.createBadge(badgeX, y + 5, "ASYNC", "#8B5CF6");
      group.appendChild(badge);
    }

    return group;
  }

  /**
   * Create a badge element
   */
  createBadge(x, y, text, color) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const padding = 4;
    const textElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    textElement.textContent = text;
    textElement.setAttribute("font-size", "10");

    const width = text.length * 6 + padding * 2;
    const height = 14;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("rx", "3");
    rect.setAttribute("fill", color);

    textElement.setAttribute("x", x + width / 2);
    textElement.setAttribute("y", y + height / 2 + 1);
    textElement.setAttribute("text-anchor", "middle");
    textElement.setAttribute("dominant-baseline", "middle");
    textElement.setAttribute("fill", "white");
    textElement.setAttribute("font-weight", "bold");

    group.appendChild(rect);
    group.appendChild(textElement);

    return group;
  }

  /**
   * Get color for HTTP method
   */
  getMethodColor(method) {
    const colors = {
      GET: "#22C55E",
      POST: "#3B82F6",
      PUT: "#F59E0B",
      PATCH: "#8B5CF6",
      DELETE: "#EF4444",
      HEAD: "#6B7280",
      OPTIONS: "#6B7280",
    };
    return colors[method] || "#6B7280";
  }

  /**
   * Get default flow color by index
   */
  getDefaultColor(index) {
    const palette = [
      "#22C55E",
      "#EF4444",
      "#F59E0B",
      "#8B5CF6",
      "#3B82F6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
    ];
    return palette[index % palette.length];
  }

  // ... additional renderer methods
}

export { SVGRenderer };
```

### 3. State Management

```javascript
// src/core/state/store.js

/**
 * Central state store using observer pattern
 */
class DiagramStore {
  constructor() {
    this.state = {
      // Diagram data
      ast: null,
      source: "",

      // Timeline state
      currentStep: 0,
      totalSteps: 0,
      isPlaying: false,
      playbackSpeed: 1,

      // Flow state
      flows: [],
      hiddenFlows: [],

      // UI state
      zoom: 1,
      panX: 0,
      panY: 0,
      theme: "light",

      // Editor state
      errors: [],
      warnings: [],
    };

    this.listeners = new Set();
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  setState(updates) {
    const prevState = this.state;
    this.state = { ...this.state, ...updates };

    this.listeners.forEach((listener) => {
      listener(this.state, prevState);
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Timeline actions

  nextStep() {
    if (this.state.currentStep < this.state.totalSteps - 1) {
      this.setState({ currentStep: this.state.currentStep + 1 });
    }
  }

  prevStep() {
    if (this.state.currentStep > 0) {
      this.setState({ currentStep: this.state.currentStep - 1 });
    }
  }

  goToStep(step) {
    const bounded = Math.max(0, Math.min(step, this.state.totalSteps - 1));
    this.setState({ currentStep: bounded });
  }

  play() {
    this.setState({ isPlaying: true });
  }

  pause() {
    this.setState({ isPlaying: false });
  }

  setPlaybackSpeed(speed) {
    this.setState({ playbackSpeed: speed });
  }

  // Flow actions

  toggleFlow(flowId) {
    const hidden = this.state.hiddenFlows;
    const newHidden = hidden.includes(flowId)
      ? hidden.filter((f) => f !== flowId)
      : [...hidden, flowId];
    this.setState({ hiddenFlows: newHidden });
  }

  showAllFlows() {
    this.setState({ hiddenFlows: [] });
  }

  hideAllFlows() {
    this.setState({ hiddenFlows: this.state.flows.map((f) => f.id) });
  }

  // Diagram actions

  setSource(source) {
    this.setState({ source });
  }

  setAST(ast) {
    this.setState({
      ast,
      flows: ast.flows,
      totalSteps: ast.messages.length,
      currentStep: 0,
    });
  }

  // UI actions

  setZoom(zoom) {
    this.setState({ zoom: Math.max(0.25, Math.min(4, zoom)) });
  }

  setPan(x, y) {
    this.setState({ panX: x, panY: y });
  }

  setTheme(theme) {
    this.setState({ theme });
  }
}

export { DiagramStore };
```

### 4. Timeline Component

```javascript
// src/components/Timeline/Timeline.js

/**
 * Timeline slider and controls component
 */
class TimelineComponent {
  constructor(container, store) {
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    this.store = store;
    this.playInterval = null;

    this.render();
    this.bindEvents();

    // Subscribe to store updates
    this.store.subscribe((state) => this.update(state));
  }

  render() {
    this.container.innerHTML = `
      <div class="timeline-component">
        <div class="timeline-controls">
          <button class="btn-icon" data-action="start" title="Go to start">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn-icon" data-action="prev" title="Previous step">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn-icon btn-play" data-action="play" title="Play/Pause">
            <svg class="play-icon" viewBox="0 0 24 24" width="24" height="24">
              <path d="M8 5v14l11-7z" fill="currentColor"/>
            </svg>
            <svg class="pause-icon" viewBox="0 0 24 24" width="24" height="24" style="display:none">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn-icon" data-action="next" title="Next step">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn-icon" data-action="end" title="Go to end">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        
        <div class="timeline-slider-container">
          <input 
            type="range" 
            class="timeline-slider" 
            min="0" 
            max="0" 
            value="0"
          />
          <div class="timeline-markers"></div>
        </div>
        
        <div class="timeline-info">
          <span class="step-counter">Step 0 of 0</span>
          <select class="speed-select" title="Playback speed">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
          </select>
        </div>
      </div>
    `;

    // Cache DOM references
    this.slider = this.container.querySelector(".timeline-slider");
    this.stepCounter = this.container.querySelector(".step-counter");
    this.playBtn = this.container.querySelector('[data-action="play"]');
    this.playIcon = this.container.querySelector(".play-icon");
    this.pauseIcon = this.container.querySelector(".pause-icon");
    this.speedSelect = this.container.querySelector(".speed-select");
    this.markersContainer = this.container.querySelector(".timeline-markers");
  }

  bindEvents() {
    // Control button clicks
    this.container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleAction(action);
      });
    });

    // Slider input
    this.slider.addEventListener("input", (e) => {
      this.store.goToStep(parseInt(e.target.value, 10));
    });

    // Speed select
    this.speedSelect.addEventListener("change", (e) => {
      this.store.setPlaybackSpeed(parseFloat(e.target.value));
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      switch (e.key) {
        case "ArrowLeft":
          this.store.prevStep();
          break;
        case "ArrowRight":
          this.store.nextStep();
          break;
        case " ":
          e.preventDefault();
          this.handleAction("play");
          break;
        case "Home":
          this.store.goToStep(0);
          break;
        case "End":
          this.store.goToStep(this.store.getState().totalSteps - 1);
          break;
      }
    });
  }

  handleAction(action) {
    const state = this.store.getState();

    switch (action) {
      case "start":
        this.store.goToStep(0);
        break;
      case "prev":
        this.store.prevStep();
        break;
      case "play":
        if (state.isPlaying) {
          this.store.pause();
          this.stopPlayback();
        } else {
          this.store.play();
          this.startPlayback();
        }
        break;
      case "next":
        this.store.nextStep();
        break;
      case "end":
        this.store.goToStep(state.totalSteps - 1);
        break;
    }
  }

  startPlayback() {
    const state = this.store.getState();
    const interval = 1000 / state.playbackSpeed;

    this.playInterval = setInterval(() => {
      const current = this.store.getState();
      if (current.currentStep >= current.totalSteps - 1) {
        this.store.pause();
        this.stopPlayback();
      } else {
        this.store.nextStep();
      }
    }, interval);
  }

  stopPlayback() {
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  update(state) {
    // Update slider
    this.slider.max = Math.max(0, state.totalSteps - 1);
    this.slider.value = state.currentStep;

    // Update counter
    this.stepCounter.textContent = `Step ${state.currentStep + 1} of ${
      state.totalSteps
    }`;

    // Update play button
    if (state.isPlaying) {
      this.playIcon.style.display = "none";
      this.pauseIcon.style.display = "block";
    } else {
      this.playIcon.style.display = "block";
      this.pauseIcon.style.display = "none";
    }

    // Update markers for flows
    this.updateMarkers(state);
  }

  updateMarkers(state) {
    if (!state.ast) return;

    this.markersContainer.innerHTML = "";
    const totalSteps = state.totalSteps;

    state.ast.messages.forEach((message, index) => {
      const marker = document.createElement("div");
      marker.className = "timeline-marker";
      marker.style.left = `${(index / (totalSteps - 1)) * 100}%`;

      // Color by flow
      if (message.annotations.flows.length > 0) {
        const flowId = message.annotations.flows[0];
        const flow = state.flows.find((f) => f.id === flowId);
        if (flow) {
          marker.style.backgroundColor = flow.color;
        }
      }

      this.markersContainer.appendChild(marker);
    });
  }
}

export { TimelineComponent };
```

### 5. Flow Legend Component

```javascript
// src/components/FlowLegend/FlowLegend.js

/**
 * Flow legend with visibility toggles
 */
class FlowLegendComponent {
  constructor(container, store) {
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    this.store = store;

    this.render();
    this.bindEvents();
    this.store.subscribe((state) => this.update(state));
  }

  render() {
    this.container.innerHTML = `
      <div class="flow-legend">
        <div class="flow-legend-header">
          <h3>Flows</h3>
          <div class="flow-legend-actions">
            <button class="btn-link" data-action="show-all">Show all</button>
            <button class="btn-link" data-action="hide-all">Hide all</button>
          </div>
        </div>
        <ul class="flow-list"></ul>
      </div>
    `;

    this.flowList = this.container.querySelector(".flow-list");
  }

  bindEvents() {
    this.container
      .querySelector('[data-action="show-all"]')
      .addEventListener("click", () => this.store.showAllFlows());

    this.container
      .querySelector('[data-action="hide-all"]')
      .addEventListener("click", () => this.store.hideAllFlows());

    this.flowList.addEventListener("click", (e) => {
      const flowItem = e.target.closest("[data-flow-id]");
      if (flowItem) {
        this.store.toggleFlow(flowItem.dataset.flowId);
      }
    });

    // Keyboard shortcuts (1-9 to toggle flows)
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const flows = this.store.getState().flows;
        if (flows[num - 1]) {
          this.store.toggleFlow(flows[num - 1].id);
        }
      }
    });
  }

  update(state) {
    this.flowList.innerHTML = state.flows
      .map((flow, index) => {
        const isHidden = state.hiddenFlows.includes(flow.id);

        return `
        <li 
          class="flow-item ${isHidden ? "hidden" : ""}" 
          data-flow-id="${flow.id}"
        >
          <span 
            class="flow-color" 
            style="background-color: ${flow.color}"
          ></span>
          <span class="flow-name">${flow.displayName}</span>
          <span class="flow-shortcut">${index + 1}</span>
          <span class="flow-toggle">
            ${isHidden ? "○" : "●"}
          </span>
        </li>
      `;
      })
      .join("");
  }
}

export { FlowLegendComponent };
```

### 6. Main Visualizer Class

```javascript
// src/index.js

import { Lexer } from "./core/parser/lexer.js";
import { Parser } from "./core/parser/parser.js";
import { SVGRenderer } from "./core/renderer/svg-renderer.js";
import { DiagramStore } from "./core/state/store.js";
import { TimelineComponent } from "./components/Timeline/Timeline.js";
import { FlowLegendComponent } from "./components/FlowLegend/FlowLegend.js";

/**
 * Main Sequence Visualizer class
 */
class SequenceVisualizer {
  constructor(container, options = {}) {
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    this.options = {
      theme: "light",
      showTimeline: true,
      showFlowLegend: true,
      showEditor: false,
      showStepDetails: true,
      ...options,
    };

    this.store = new DiagramStore();
    this.renderer = null;
    this.timeline = null;
    this.flowLegend = null;

    this.init();
  }

  init() {
    // Create layout structure
    this.container.innerHTML = `
      <div class="sequence-visualizer theme-${this.options.theme}">
        ${
          this.options.showEditor
            ? `
          <div class="sv-editor-panel">
            <div class="sv-editor"></div>
          </div>
        `
            : ""
        }
        
        <div class="sv-main-panel">
          <div class="sv-toolbar">
            <div class="sv-toolbar-left">
              <button class="btn-icon" data-action="zoom-in" title="Zoom in">+</button>
              <button class="btn-icon" data-action="zoom-out" title="Zoom out">-</button>
              <button class="btn-icon" data-action="fit" title="Fit to screen">⊡</button>
            </div>
            <div class="sv-toolbar-right">
              <button class="btn-icon" data-action="theme" title="Toggle theme">◐</button>
              <button class="btn" data-action="export-png">Export PNG</button>
              <button class="btn" data-action="export-svg">Export SVG</button>
            </div>
          </div>
          
          <div class="sv-diagram-container">
            <div class="sv-diagram"></div>
            ${
              this.options.showFlowLegend
                ? '<div class="sv-flow-legend"></div>'
                : ""
            }
          </div>
          
          ${this.options.showTimeline ? '<div class="sv-timeline"></div>' : ""}
          
          ${
            this.options.showStepDetails
              ? '<div class="sv-step-details"></div>'
              : ""
          }
        </div>
      </div>
    `;

    // Initialize renderer
    const diagramContainer = this.container.querySelector(".sv-diagram");
    this.renderer = new SVGRenderer(diagramContainer, {
      theme: this.options.theme,
    });

    // Initialize timeline
    if (this.options.showTimeline) {
      const timelineContainer = this.container.querySelector(".sv-timeline");
      this.timeline = new TimelineComponent(timelineContainer, this.store);
    }

    // Initialize flow legend
    if (this.options.showFlowLegend) {
      const legendContainer = this.container.querySelector(".sv-flow-legend");
      this.flowLegend = new FlowLegendComponent(legendContainer, this.store);
    }

    // Subscribe to state changes for re-rendering
    this.store.subscribe((state, prevState) => {
      if (
        state.ast &&
        (state.currentStep !== prevState.currentStep ||
          state.hiddenFlows !== prevState.hiddenFlows)
      ) {
        this.renderer.render(state.ast, state);
      }

      // Update step details
      if (this.options.showStepDetails) {
        this.updateStepDetails(state);
      }
    });

    // Bind toolbar events
    this.bindToolbarEvents();
  }

  /**
   * Render diagram from source
   */
  render(source) {
    try {
      // Parse source
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Update store
      this.store.setSource(source);
      this.store.setAST(ast);

      // Render SVG
      this.renderer.render(ast, this.store.getState());

      return { success: true, ast };
    } catch (error) {
      console.error("Parse error:", error);
      this.store.setState({ errors: [error.message] });
      return { success: false, error };
    }
  }

  /**
   * Update step details panel
   */
  updateStepDetails(state) {
    const detailsContainer = this.container.querySelector(".sv-step-details");
    if (!detailsContainer || !state.ast) return;

    const message = state.ast.messages[state.currentStep];
    if (!message) {
      detailsContainer.innerHTML = "";
      return;
    }

    const { annotations } = message;

    detailsContainer.innerHTML = `
      <div class="step-details-content">
        <div class="step-detail">
          <span class="detail-label">From:</span>
          <span class="detail-value">${message.source}</span>
        </div>
        <div class="step-detail">
          <span class="detail-label">To:</span>
          <span class="detail-value">${message.target}</span>
        </div>
        <div class="step-detail">
          <span class="detail-label">Message:</span>
          <span class="detail-value">${message.text}</span>
        </div>
        ${
          annotations.path
            ? `
          <div class="step-detail">
            <span class="detail-label">Path:</span>
            <span class="detail-value">
              ${
                annotations.method
                  ? `<span class="method-badge ${annotations.method.toLowerCase()}">${
                      annotations.method
                    }</span>`
                  : ""
              }
              ${annotations.path}
            </span>
          </div>
        `
            : ""
        }
        ${
          annotations.requestType
            ? `
          <div class="step-detail">
            <span class="detail-label">Type:</span>
            <span class="detail-value">${annotations.requestType}</span>
          </div>
        `
            : ""
        }
        <div class="step-detail">
          <span class="detail-label">Mode:</span>
          <span class="detail-value">${
            annotations.isAsync ? "Asynchronous" : "Synchronous"
          }</span>
        </div>
        ${
          annotations.timeout
            ? `
          <div class="step-detail">
            <span class="detail-label">Timeout:</span>
            <span class="detail-value">${annotations.timeout}</span>
          </div>
        `
            : ""
        }
        ${
          annotations.flows.length > 0
            ? `
          <div class="step-detail">
            <span class="detail-label">Flows:</span>
            <span class="detail-value">${annotations.flows.join(", ")}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  bindToolbarEvents() {
    this.container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;

        switch (action) {
          case "zoom-in":
            this.store.setZoom(this.store.getState().zoom * 1.25);
            break;
          case "zoom-out":
            this.store.setZoom(this.store.getState().zoom * 0.8);
            break;
          case "fit":
            this.store.setZoom(1);
            this.store.setPan(0, 0);
            break;
          case "theme":
            const newTheme =
              this.store.getState().theme === "light" ? "dark" : "light";
            this.store.setTheme(newTheme);
            this.container.querySelector(
              ".sequence-visualizer"
            ).className = `sequence-visualizer theme-${newTheme}`;
            break;
          case "export-png":
            this.exportPNG();
            break;
          case "export-svg":
            this.exportSVG();
            break;
        }
      });
    });
  }

  // Public API methods

  goToStep(step) {
    this.store.goToStep(step);
  }

  play() {
    this.store.play();
  }

  pause() {
    this.store.pause();
  }

  toggleFlow(flowId) {
    this.store.toggleFlow(flowId);
  }

  setTheme(theme) {
    this.store.setTheme(theme);
  }

  exportPNG() {
    // Implementation for PNG export
    const svg = this.container.querySelector(".sv-diagram svg");
    // ... canvas conversion and download
  }

  exportSVG() {
    const svg = this.container.querySelector(".sv-diagram svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "sequence-diagram.svg";
    a.click();

    URL.revokeObjectURL(url);
  }

  getState() {
    return this.store.getState();
  }

  destroy() {
    this.container.innerHTML = "";
  }
}

// Export for module usage
export { SequenceVisualizer };

// Expose globally for script tag usage
if (typeof window !== "undefined") {
  window.SequenceVisualizer = SequenceVisualizer;
}
```

---

## Complete HTML Example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sequence Diagram Visualizer - Demo</title>
    <style>
      /* Base styles */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          sans-serif;
        background: #f5f5f5;
        min-height: 100vh;
      }

      /* Visualizer container */
      .sequence-visualizer {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: white;
      }

      .sequence-visualizer.theme-dark {
        background: #1a1a2e;
        color: #eee;
      }

      /* Toolbar */
      .sv-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        border-bottom: 1px solid #e5e5e5;
        background: #fafafa;
      }

      .theme-dark .sv-toolbar {
        background: #16213e;
        border-color: #333;
      }

      .sv-toolbar-left,
      .sv-toolbar-right {
        display: flex;
        gap: 8px;
      }

      /* Buttons */
      .btn,
      .btn-icon {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .btn:hover,
      .btn-icon:hover {
        background: #f0f0f0;
        border-color: #ccc;
      }

      .btn-icon {
        padding: 8px 12px;
        font-size: 16px;
      }

      .theme-dark .btn,
      .theme-dark .btn-icon {
        background: #1a1a2e;
        border-color: #444;
        color: #eee;
      }

      .theme-dark .btn:hover,
      .theme-dark .btn-icon:hover {
        background: #2a2a4e;
      }

      /* Main panel */
      .sv-main-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Diagram container */
      .sv-diagram-container {
        flex: 1;
        display: flex;
        overflow: hidden;
        position: relative;
      }

      .sv-diagram {
        flex: 1;
        overflow: auto;
        padding: 20px;
      }

      /* Flow legend */
      .sv-flow-legend {
        width: 220px;
        border-left: 1px solid #e5e5e5;
        padding: 16px;
        overflow-y: auto;
      }

      .theme-dark .sv-flow-legend {
        border-color: #333;
      }

      .flow-legend-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .flow-legend-header h3 {
        font-size: 14px;
        font-weight: 600;
      }

      .flow-legend-actions {
        display: flex;
        gap: 8px;
      }

      .btn-link {
        background: none;
        border: none;
        color: #3b82f6;
        cursor: pointer;
        font-size: 12px;
        padding: 0;
      }

      .btn-link:hover {
        text-decoration: underline;
      }

      .flow-list {
        list-style: none;
      }

      .flow-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .flow-item:hover {
        background: #f5f5f5;
      }

      .theme-dark .flow-item:hover {
        background: #2a2a4e;
      }

      .flow-item.hidden {
        opacity: 0.5;
      }

      .flow-color {
        width: 12px;
        height: 12px;
        border-radius: 3px;
      }

      .flow-name {
        flex: 1;
        font-size: 13px;
      }

      .flow-shortcut {
        font-size: 11px;
        color: #999;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 3px;
      }

      .theme-dark .flow-shortcut {
        background: #333;
      }

      .flow-toggle {
        font-size: 12px;
        color: #666;
      }

      /* Timeline */
      .sv-timeline {
        padding: 12px 20px;
        border-top: 1px solid #e5e5e5;
        background: #fafafa;
      }

      .theme-dark .sv-timeline {
        background: #16213e;
        border-color: #333;
      }

      .timeline-component {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .timeline-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .timeline-slider-container {
        flex: 1;
        position: relative;
      }

      .timeline-slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        background: #ddd;
        border-radius: 3px;
        outline: none;
      }

      .timeline-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #3b82f6;
        border-radius: 50%;
        cursor: pointer;
      }

      .timeline-markers {
        position: absolute;
        top: 12px;
        left: 0;
        right: 0;
        height: 4px;
      }

      .timeline-marker {
        position: absolute;
        width: 4px;
        height: 4px;
        background: #999;
        border-radius: 50%;
        transform: translateX(-50%);
      }

      .timeline-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 140px;
      }

      .step-counter {
        font-size: 13px;
        color: #666;
      }

      .speed-select {
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        font-size: 12px;
      }

      .theme-dark .speed-select {
        background: #1a1a2e;
        border-color: #444;
        color: #eee;
      }

      /* Step details */
      .sv-step-details {
        padding: 12px 20px;
        border-top: 1px solid #e5e5e5;
        background: #f9fafb;
      }

      .theme-dark .sv-step-details {
        background: #0f0f23;
        border-color: #333;
      }

      .step-details-content {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }

      .step-detail {
        display: flex;
        gap: 8px;
        font-size: 13px;
      }

      .detail-label {
        color: #666;
        font-weight: 500;
      }

      .theme-dark .detail-label {
        color: #999;
      }

      .detail-value {
        color: #333;
      }

      .theme-dark .detail-value {
        color: #eee;
      }

      .method-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
        color: white;
        margin-right: 4px;
      }

      .method-badge.get {
        background: #22c55e;
      }
      .method-badge.post {
        background: #3b82f6;
      }
      .method-badge.put {
        background: #f59e0b;
      }
      .method-badge.delete {
        background: #ef4444;
      }
      .method-badge.patch {
        background: #8b5cf6;
      }

      /* SVG diagram styles */
      .sequence-diagram .participant-box {
        fill: #fff;
        stroke: #333;
        stroke-width: 2;
      }

      .theme-dark .sequence-diagram .participant-box {
        fill: #1a1a2e;
        stroke: #666;
      }

      .sequence-diagram .participant-label {
        font-size: 14px;
        font-weight: 500;
        fill: #333;
      }

      .theme-dark .sequence-diagram .participant-label {
        fill: #eee;
      }

      .sequence-diagram .message-label {
        font-size: 12px;
      }

      .sequence-diagram .message.past line {
        opacity: 0.4;
      }

      .sequence-diagram .message.current line {
        stroke-width: 3;
        filter: drop-shadow(0 0 4px currentColor);
      }

      .sequence-diagram .message.hidden {
        display: none;
      }

      .sequence-diagram .lifeline {
        stroke: #ddd;
        stroke-width: 1;
        stroke-dasharray: 5, 5;
      }

      .theme-dark .sequence-diagram .lifeline {
        stroke: #444;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>

    <script type="module">
      // Import or use the SequenceVisualizer from bundled file
      // For demo, we'll inline a simplified version

      // Initialize visualizer
      const visualizer = new SequenceVisualizer("#app", {
        theme: "light",
        showTimeline: true,
        showFlowLegend: true,
        showStepDetails: true,
      });

      // Render diagram
      visualizer.render(`
%%{init: {"system": "E-Commerce Platform", "version": "2.0.0"}}%%
sequenceDiagram
    title: Order Checkout Flow
    description: Complete order processing with payment and inventory management
    
    %%flow happy "Happy Path" #22C55E
    %%flow payment_error "Payment Failed" #EF4444
    %%flow inventory_error "Out of Stock" #F59E0B
    
    participant FE as Frontend
    participant API as API Gateway
    participant Auth as Auth Service
    participant Cart as Cart Service
    participant Inv as Inventory
    participant Pay as Payment
    participant Queue as Message Queue
    participant Notify as Notifications
    
    %% Authentication (all flows)
    FE->>API: Submit Order @path(POST /api/v1/orders) @type(JSON) @flow(happy, payment_error, inventory_error)
    API->>Auth: Validate Token @path(POST /validate) @type(JSON) @sync @flow(happy, payment_error, inventory_error)
    Auth-->>API: Token Valid @flow(happy, payment_error, inventory_error)
    
    %% Get cart
    API->>Cart: Get Cart Items @path(GET /cart/{userId}) @type(JSON) @sync @flow(happy, payment_error, inventory_error)
    Cart-->>API: Cart Items @flow(happy, payment_error, inventory_error)
    
    %% Check inventory
    API->>Inv: Check Availability @path(POST /inventory/check) @type(JSON) @sync @flow(happy, payment_error, inventory_error)
    Inv-->>API: All Available @flow(happy, payment_error)
    Inv-->>API: Item Out of Stock @flow(inventory_error)
    API-->>FE: Out of Stock Error @flow(inventory_error)
    
    %% Process payment (happy + payment_error flows)
    API->>Pay: Process Payment @path(POST /payments) @type(JSON) @sync @timeout(30000ms) @flow(happy, payment_error)
    Pay-->>API: Payment Success @flow(happy)
    Pay-->>API: Payment Declined @flow(payment_error)
    API-->>FE: Payment Failed @flow(payment_error)
    
    %% Complete order (happy path only)
    API->>Inv: Reserve Items @path(POST /inventory/reserve) @type(JSON) @sync @flow(happy)
    Inv-->>API: Items Reserved @flow(happy)
    
    API-->>Queue: Order Created Event @path(order.created) @type(JSON) @async @queue(order-events) @flow(happy)
    Queue-->>Notify: Send Confirmation @async @flow(happy)
    Notify-->>FE: Email Sent @async @flow(happy)
    
    API-->>FE: Order Confirmed @type(JSON) @flow(happy)
    `);
    </script>
  </body>
</html>
```

---

## Styling Guide

### CSS Custom Properties

```css
:root {
  /* Colors */
  --sv-primary: #3b82f6;
  --sv-success: #22c55e;
  --sv-warning: #f59e0b;
  --sv-danger: #ef4444;
  --sv-info: #8b5cf6;

  /* Light theme */
  --sv-bg: #ffffff;
  --sv-bg-secondary: #f9fafb;
  --sv-text: #333333;
  --sv-text-secondary: #666666;
  --sv-border: #e5e5e5;

  /* Dark theme */
  --sv-dark-bg: #1a1a2e;
  --sv-dark-bg-secondary: #16213e;
  --sv-dark-text: #eeeeee;
  --sv-dark-text-secondary: #999999;
  --sv-dark-border: #333333;

  /* Spacing */
  --sv-spacing-xs: 4px;
  --sv-spacing-sm: 8px;
  --sv-spacing-md: 16px;
  --sv-spacing-lg: 24px;

  /* Typography */
  --sv-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    sans-serif;
  --sv-font-size-sm: 12px;
  --sv-font-size-md: 14px;
  --sv-font-size-lg: 16px;

  /* Borders */
  --sv-radius-sm: 4px;
  --sv-radius-md: 6px;
  --sv-radius-lg: 8px;
}
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Commands

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.
