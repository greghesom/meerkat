# Diagram View Feature

The Diagram View feature allows you to overlay animated sequence diagram flows onto draw.io architecture diagrams, providing a powerful visualization of how messages flow through your system architecture.

## Overview

This feature:
1. Loads and renders `.drawio` XML files using the draw.io viewer library
2. Maps sequence diagram participants to shapes in the architecture diagram
3. Animates message flows over the architecture with timeline scrubbing
4. Highlights shapes as messages pass through them
5. Displays message details as overlays

## Getting Started

### Accessing Diagram View

Navigate to the Diagram View page by clicking the "Diagram" button in the top navigation bar, or go directly to `/src/diagram-view/index.html`.

### Loading Files

1. **Load a Sequence Diagram**:
   - Click "Load Sequence JSON" and select a sequence diagram configuration file
   - Or select a diagram from the dropdown (if configured in `diagrams/config.json`)

2. **Load an Architecture Diagram**:
   - Click "Load Diagram XML" and select a `.drawio` file
   - The diagram will be rendered in the main canvas area

### Mapping Participants to Shapes

Once both files are loaded, the feature will automatically attempt to map sequence diagram participants to shapes in the architecture diagram based on label matching.

**Automatic Mapping**:
- Click the "Auto-Map" button in the sidebar
- The system will match participants to shapes based on:
  - Exact label matches (confidence: 1.0)
  - Exact ID matches (confidence: 0.95)
  - Partial label matches (confidence: 0.7-0.6)
  - Fuzzy word-boundary matches (confidence: 0.5)

**Manual Mapping**:
- Review the mapping panel in the sidebar
- Each participant shows a status indicator:
  - ✓ (green) = Successfully mapped
  - ✗ (red) = Not mapped
- Use the dropdown to manually select a shape for each participant
- Hover over the dropdown to highlight shapes on the diagram

### Animating Flows

Once participants are mapped to shapes, you can animate the message flows:

1. **Play**: Click the "▶ Play" button to automatically step through all messages
2. **Step**: Click the "Step →" button to advance one message at a time
3. **Reset**: Click the "↺ Reset" button to return to the initial state
4. **Speed Control**: Adjust the speed slider to control animation timing (0.5s - 3.0s per step)

### Animation Behavior

- **Source Highlighting**: The source shape is highlighted in green
- **Target Highlighting**: The target shape is highlighted in blue
- **Flow Animation**: A marker animates along the path between shapes
- **Message Overlay**: Message details appear near the source shape

## Architecture

### Core Classes

#### DrawioLoader (`drawio/drawio-loader.js`)
Dynamically loads the draw.io viewer script from `viewer.diagrams.net`.

#### DrawioRenderer (`drawio/drawio-renderer.js`)
Parses and renders `.drawio` XML files, handling both compressed and uncompressed formats.

#### ShapeExtractor (`drawio/shape-extractor.js`)
Extracts shape metadata from the rendered diagram, including:
- Cell ID
- Label (plain text and raw HTML)
- Geometry and bounds
- Style information
- Custom attributes

#### ConnectionExtractor (`drawio/connection-extractor.js`)
Extracts edge connections between shapes, including:
- Source and target shape IDs
- Path waypoints
- Total path length
- Labels and styles

#### AutoMapper (`mapping/auto-mapper.js`)
Automatically maps sequence diagram participants to architecture shapes using intelligent label matching with confidence scoring.

#### MappingStore (`mapping/mapping-store.js`)
Manages and persists participant-to-shape mappings using localStorage.

#### MappingPanel (`mapping/mapping-panel.js`)
UI component for viewing and managing participant mappings.

#### ShapeHighlighter (`animation/shape-highlighter.js`)
Highlights shapes on the diagram during animation with configurable colors for source, target, and active states.

#### FlowAnimator (`animation/flow-animator.js`)
Animates markers along paths between shapes with customizable duration, easing, and marker types (dot, arrow, packet).

#### MessageOverlay (`animation/message-overlay.js`)
Displays message details as an overlay, including:
- Message text
- Source and target
- Annotations (path, type, async/sync, timeout, queue)

#### DiagramView (`diagram-view.js`)
Main controller class that orchestrates all components and manages the overall workflow.

## File Structure

```
src/diagram-view/
├── index.html                    # Main HTML page
├── diagram-view.js               # Main controller class
├── drawio/
│   ├── drawio-loader.js          # Load draw.io viewer script
│   ├── drawio-renderer.js        # Render .drawio XML files
│   ├── shape-extractor.js        # Extract shapes from diagram
│   └── connection-extractor.js   # Extract edges/connections
├── mapping/
│   ├── auto-mapper.js            # Auto-map participants to shapes
│   ├── mapping-store.js          # Store and persist mappings
│   └── mapping-panel.js          # UI component for mappings
├── animation/
│   ├── shape-highlighter.js      # Highlight shapes on diagram
│   ├── flow-animator.js          # Animate markers along paths
│   └── message-overlay.js        # Show message details
└── styles/
    └── diagram-view.css          # Styles for diagram view
```

## API Usage

### Creating a DiagramView Instance

```javascript
import { DiagramView } from './diagram-view.js';

const diagramView = new DiagramView({
  diagramContainer: document.getElementById('diagram-container'),
  overlayContainer: document.getElementById('overlay-container'),
  mappingPanelContainer: document.getElementById('mapping-panel'),
  configId: 'my-diagram-config'
});

await diagramView.init();
```

### Loading Diagrams

```javascript
// Load architecture diagram
await diagramView.loadDiagram(drawioXmlContent);

// Load sequence diagram AST
diagramView.setSequenceAst(parsedAst);
```

### Running Animations

```javascript
// Auto-map participants
diagramView.runAutoMapping();

// Animate a specific step
await diagramView.animateStep(0);

// Play through all steps
diagramView.play(1500); // 1.5s between steps

// Stop playback
diagramView.stop();

// Reset to initial state
diagramView.reset();
```

### Accessing Mappings

```javascript
// Get all mappings
const mappings = diagramView.getMappings();

// Export configuration
const config = diagramView.exportConfig();
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript ES6+ support
- Uses standard DOM APIs

## Limitations

- Requires network access to load draw.io viewer script
- Large diagrams may have performance implications
- Automatic mapping works best with descriptive, consistent naming

## Future Enhancements

- Support for offline draw.io viewer
- Enhanced mapping intelligence with ML
- Export animations as video/GIF
- Multi-flow visualization
- Custom marker types and colors
- Interactive message overlay editing
- Zoom and pan controls for large diagrams
- Timeline scrubber for fine-grained control
