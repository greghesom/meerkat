import { DrawioRenderer } from './drawio/drawio-renderer.js';
import { ShapeExtractor } from './drawio/shape-extractor.js';
import { ConnectionExtractor } from './drawio/connection-extractor.js';
import { AutoMapper } from './mapping/auto-mapper.js';
import { MappingStore } from './mapping/mapping-store.js';
import { MappingPanel } from './mapping/mapping-panel.js';
import { ShapeHighlighter } from './animation/shape-highlighter.js';
import { FlowAnimator } from './animation/flow-animator.js';
import { MessageOverlay } from './animation/message-overlay.js';

/**
 * DiagramView - Main controller for diagram view feature
 */
export class DiagramView {
  /**
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      diagramContainer: null,
      overlayContainer: null,
      mappingPanelContainer: null,
      sequenceAst: null,
      diagramXml: null,
      configId: 'default',
      ...options
    };

    // Components
    this.renderer = null;
    this.shapeExtractor = null;
    this.connectionExtractor = null;
    this.autoMapper = new AutoMapper();
    this.mappingStore = null;
    this.mappingPanel = null;
    this.highlighter = null;
    this.animator = null;
    this.messageOverlay = null;

    // State
    this.graph = null;
    this.shapes = [];
    this.connections = [];
    this.participants = [];
    this.currentStep = 0;
    this.isPlaying = false;
    this.playInterval = null;
  }

  /**
   * Initialize the diagram view
   * @returns {Promise<void>}
   */
  async init() {
    if (!this.options.diagramContainer) {
      throw new Error('Diagram container is required');
    }

    // Initialize renderer
    this.renderer = new DrawioRenderer(this.options.diagramContainer);

    // Render diagram if XML is provided
    if (this.options.diagramXml) {
      await this.loadDiagram(this.options.diagramXml);
    }

    // Initialize mapping store
    this.mappingStore = new MappingStore(this.options.configId);
    this.mappingStore.load();

    // Initialize mapping panel if container provided
    if (this.options.mappingPanelContainer) {
      this.mappingPanel = new MappingPanel(this.options.mappingPanelContainer, {
        onMappingChange: (participantId, shapeId) => this.handleMappingChange(participantId, shapeId),
        onHighlightShape: (shapeId) => this.handleHighlightShape(shapeId),
        onAutoMap: () => this.runAutoMapping(),
        onClearAll: () => this.clearAllMappings()
      });
    }

    // Initialize message overlay if container provided
    if (this.options.overlayContainer) {
      this.messageOverlay = new MessageOverlay(this.options.overlayContainer);
    }

    // Set sequence AST if provided
    if (this.options.sequenceAst) {
      this.setSequenceAst(this.options.sequenceAst);
    }
  }

  /**
   * Load and render a draw.io diagram
   * @param {string} xmlContent - Draw.io XML content
   * @returns {Promise<void>}
   */
  async loadDiagram(xmlContent) {
    // Render diagram
    this.graph = await this.renderer.render(xmlContent);

    // Extract shapes and connections
    this.shapeExtractor = new ShapeExtractor(this.graph);
    this.shapes = this.shapeExtractor.extract();

    this.connectionExtractor = new ConnectionExtractor(this.graph);
    this.connections = this.connectionExtractor.extract();

    // Initialize highlighter and animator
    this.highlighter = new ShapeHighlighter(this.graph);
    
    if (this.options.overlayContainer) {
      this.animator = new FlowAnimator(this.graph, this.options.overlayContainer);
    }

    // Fit diagram to container
    this.renderer.fitToContainer();

    // Update mapping panel if it exists
    this.updateMappingPanel();
  }

  /**
   * Set the sequence diagram AST
   * @param {Object} ast - Parsed sequence diagram AST
   */
  setSequenceAst(ast) {
    this.options.sequenceAst = ast;
    
    // Extract participants from AST
    this.participants = ast.participants || [];

    // Update mapping panel
    this.updateMappingPanel();

    // Try auto-mapping if no mappings exist
    if (this.participants.length > 0 && this.mappingStore.getAll().length === 0) {
      this.runAutoMapping();
    }
  }

  /**
   * Update the mapping panel with current data
   */
  updateMappingPanel() {
    if (!this.mappingPanel) return;

    const currentMappings = new Map();
    for (const participant of this.participants) {
      const shapeId = this.mappingStore.getShapeId(participant.id);
      if (shapeId) {
        currentMappings.set(participant.id, shapeId);
      }
    }

    this.mappingPanel.render(this.participants, this.shapes, currentMappings);
  }

  /**
   * Run automatic mapping
   */
  runAutoMapping() {
    if (this.participants.length === 0 || this.shapes.length === 0) {
      console.warn('Cannot auto-map: missing participants or shapes');
      return;
    }

    const result = this.autoMapper.map(this.participants, this.shapes);
    
    // Store successful mappings
    this.mappingStore.setFromAutoMapper(result.mappings);

    // Log results
    console.log('Auto-mapping results:', {
      mapped: result.mappings.length,
      unmapped: result.unmapped.length,
      ambiguous: result.ambiguous.length
    });

    if (result.unmapped.length > 0) {
      console.warn('Unmapped participants:', result.unmapped);
    }

    if (result.ambiguous.length > 0) {
      console.warn('Ambiguous mappings:', result.ambiguous);
    }

    // Update panel
    this.updateMappingPanel();
  }

  /**
   * Handle mapping change from panel
   * @param {string} participantId
   * @param {string|null} shapeId
   */
  handleMappingChange(participantId, shapeId) {
    if (shapeId) {
      const shape = this.shapes.find(s => s.id === shapeId);
      this.mappingStore.setMapping(participantId, shapeId, {
        shapeLabel: shape?.label || '',
        autoMapped: false,
        confidence: 1.0
      });
    } else {
      this.mappingStore.clearMapping(participantId);
    }

    this.updateMappingPanel();
  }

  /**
   * Handle shape highlight from panel
   * @param {string|null} shapeId
   */
  handleHighlightShape(shapeId) {
    if (!this.highlighter) return;

    // Clear all highlights
    this.highlighter.clearAll();

    // Highlight if shapeId provided
    if (shapeId) {
      this.highlighter.highlight(shapeId, 'active');
    }
  }

  /**
   * Clear all mappings
   */
  clearAllMappings() {
    this.mappingStore.clearAll();
    this.updateMappingPanel();
  }

  /**
   * Animate a single step
   * @param {number} stepIndex - 0-based step index
   * @returns {Promise<void>}
   */
  async animateStep(stepIndex) {
    if (!this.options.sequenceAst || !this.animator || !this.highlighter) {
      return;
    }

    const messages = this.options.sequenceAst.messages || [];
    if (stepIndex < 0 || stepIndex >= messages.length) {
      return;
    }

    const message = messages[stepIndex];
    
    // Get mapped shape IDs
    const sourceShapeId = this.mappingStore.getShapeId(message.source);
    const targetShapeId = this.mappingStore.getShapeId(message.target);

    if (!sourceShapeId || !targetShapeId) {
      console.warn(`Cannot animate step ${stepIndex}: missing shape mappings`);
      return;
    }

    // Clear previous highlights
    this.highlighter.clearAll();

    // Highlight source and target
    this.highlighter.highlight(sourceShapeId, 'source');
    this.highlighter.highlight(targetShapeId, 'target');

    // Animate flow
    await this.animator.animate(sourceShapeId, targetShapeId, {
      duration: 800,
      color: '#4CAF50',
      markerType: 'dot'
    });

    // Show message overlay if available
    if (this.messageOverlay) {
      const sourceShape = this.shapes.find(s => s.id === sourceShapeId);
      if (sourceShape && sourceShape.bounds) {
        this.messageOverlay.show(message, {
          x: sourceShape.bounds.centerX,
          y: sourceShape.bounds.centerY
        });
      }
    }
  }

  /**
   * Go to a specific step
   * @param {number} stepIndex - 0-based step index
   */
  async goToStep(stepIndex) {
    this.currentStep = stepIndex;
    await this.animateStep(stepIndex);
  }

  /**
   * Play through all steps
   * @param {number} speed - Delay between steps in ms
   */
  play(speed = 1500) {
    if (this.isPlaying) {
      this.stop();
      return;
    }

    this.isPlaying = true;
    this.currentStep = 0;

    const playNextStep = async () => {
      if (!this.isPlaying) return;

      const messages = this.options.sequenceAst?.messages || [];
      if (this.currentStep >= messages.length) {
        this.stop();
        return;
      }

      await this.animateStep(this.currentStep);
      this.currentStep++;

      this.playInterval = setTimeout(playNextStep, speed);
    };

    playNextStep();
  }

  /**
   * Stop playback
   */
  stop() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearTimeout(this.playInterval);
      this.playInterval = null;
    }
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.stop();
    this.currentStep = 0;
    if (this.highlighter) {
      this.highlighter.clearAll();
    }
    if (this.messageOverlay) {
      this.messageOverlay.hide();
    }
  }

  /**
   * Get current mappings
   * @returns {Array}
   */
  getMappings() {
    return this.mappingStore.getAll();
  }

  /**
   * Export configuration
   * @returns {Object}
   */
  exportConfig() {
    return {
      configId: this.options.configId,
      mappings: this.getMappings(),
      participants: this.participants.map(p => ({ id: p.id, displayName: p.displayName })),
      shapes: this.shapes.map(s => ({ id: s.id, label: s.label }))
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    if (this.highlighter) {
      this.highlighter.clearAll();
    }
    if (this.animator) {
      this.animator.cancelAll();
    }
    if (this.messageOverlay) {
      this.messageOverlay.hide();
    }
  }
}
