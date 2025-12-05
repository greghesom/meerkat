# Copilot Instructions for Meerkat

This document provides guidance for GitHub Copilot when working on the Meerkat project.

## Project Overview

Meerkat is a sequence diagram visualizer that extends Mermaid syntax with additional annotations for API paths, request types, sync/async behaviors, and multi-flow scenarios. It runs entirely in the browser with no server required.

## Tech Stack

- **Language**: JavaScript (ES Modules)
- **Testing**: Jest with `--experimental-vm-modules` flag
- **Linting**: ESLint
- **Build**: No build step required - runs directly in browser

## Project Structure

```
meerkat/
├── src/
│   ├── index.js              # Main entry point and SequenceVisualizer class
│   └── core/
│       ├── parser/           # Lexer and parser for extended Mermaid syntax
│       ├── renderer/         # SVG rendering components
│       └── timeline/         # Timeline and flow state management
├── test/                     # Jest test files
├── diagrams/                 # Example diagram configuration files
└── index.html               # Main HTML entry point
```

## Development Commands

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Run linting
npm run lint
```

## Coding Conventions

### JavaScript Style

- Use ES Modules (`import`/`export`)
- Use `const` for constants and `let` for variables that change
- Use descriptive variable and function names
- Add JSDoc comments for public functions and classes
- Keep functions focused and single-purpose

### File Naming

- Use kebab-case for file names (e.g., `svg-renderer.js`)
- Test files should be named `<module>.test.js`

### Testing

- Write tests for all new functionality
- Place test files in the `test/` directory
- Use descriptive test names that explain expected behavior
- Mock DOM APIs when testing rendering code

## Extended Mermaid Syntax

When working with the parser, be aware of these custom annotations:

- `@path(METHOD /endpoint)` - API path annotation
- `@type(JSON|SOAP|XML|RFC_SAP|GraphQL|gRPC|BINARY)` - Request type
- `@sync` / `@async` - Synchronous/asynchronous indicators
- `@timeout(ms)` - Timeout specification
- `@queue(name)` - Queue name for async messages
- `@flow(flowId)` - Flow membership for multi-path scenarios
- `%%flow id "Display Name" #color` - Flow definition

## Common Tasks

### Adding a New Annotation Type

1. Update the lexer in `src/core/parser/lexer.js` to recognize the new token
2. Update the parser in `src/core/parser/parser.js` to handle the annotation
3. Update the renderer to display the annotation appropriately
4. Add tests for the new functionality

### Modifying the Renderer

- The SVG renderer creates elements using `document.createElementNS`
- All SVG elements must use the SVG namespace
- Use CSS classes for styling rather than inline styles when possible

### Working with State

- The `SequenceVisualizer` class manages the rendering pipeline and AST state
- The `TimelineSlider` component handles timeline navigation with callbacks
- Use the `onChange` callback pattern for component communication
- Keep rendering logic in the `SVGRenderer` class

## Browser Compatibility

- Target modern browsers (Chrome, Firefox, Safari, Edge)
- Use standard DOM APIs; avoid polyfills unless necessary
- Test SVG rendering across different browsers
