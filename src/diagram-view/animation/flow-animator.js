import { ConnectionExtractor } from '../drawio/connection-extractor.js';

/**
 * FlowAnimator - Animates flow markers along paths between shapes
 */
export class FlowAnimator {
  /**
   * @param {Object} graph - The mxGraph instance
   * @param {HTMLElement} overlayContainer - Positioned over the diagram
   */
  constructor(graph, overlayContainer) {
    this.graph = graph;
    this.overlay = overlayContainer;
    this.connectionExtractor = new ConnectionExtractor(graph);
    this.activeAnimations = [];
  }

  /**
   * Animate flow from source to target shape
   * @param {string} sourceId - Source shape ID
   * @param {string} targetId - Target shape ID
   * @param {AnimationOptions} options
   * @returns {Promise<void>} Resolves when animation completes
   */
  async animate(sourceId, targetId, options = {}) {
    const {
      duration = 800,
      color = '#4CAF50',
      markerType = 'dot',
      markerSize = 12,
      easing = 'easeInOutCubic'
    } = options;

    // Get path points
    const points = this.getPathPoints(sourceId, targetId);
    if (points.length < 2) {
      console.warn('Not enough points to animate');
      return;
    }

    // Create marker element
    const marker = this.createMarker(markerType, color, markerSize);
    this.overlay.appendChild(marker);

    // Animate marker along path
    try {
      await this.animateAlongPath(marker, points, duration, easing);
    } finally {
      // Clean up marker
      if (marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }
  }

  /**
   * Get path points between two shapes
   * @param {string} sourceId
   * @param {string} targetId
   * @returns {Array<{x: number, y: number}>}
   */
  getPathPoints(sourceId, targetId) {
    // Try to find connecting edge
    const connection = this.connectionExtractor.findEdgeBetween(sourceId, targetId);
    
    if (connection && connection.absolutePoints.length >= 2) {
      return connection.absolutePoints;
    }
    
    // Otherwise, calculate direct path
    return this.getDirectPath(sourceId, targetId);
  }

  /**
   * Calculate direct path between two shape centers
   * @param {string} sourceId
   * @param {string} targetId
   * @returns {Array<{x: number, y: number}>}
   */
  getDirectPath(sourceId, targetId) {
    const view = this.graph.view;
    const model = this.graph.getModel();
    
    const sourceCell = model.getCell(sourceId);
    const targetCell = model.getCell(targetId);
    
    if (!sourceCell || !targetCell) {
      return [];
    }
    
    const sourceState = view.getState(sourceCell);
    const targetState = view.getState(targetCell);
    
    if (!sourceState || !targetState) {
      return [];
    }
    
    return [
      { x: sourceState.getCenterX(), y: sourceState.getCenterY() },
      { x: targetState.getCenterX(), y: targetState.getCenterY() }
    ];
  }

  /**
   * Create marker DOM element
   * @param {'dot'|'arrow'|'packet'} type
   * @param {string} color
   * @param {number} size
   * @returns {HTMLElement}
   */
  createMarker(type, color, size) {
    const marker = document.createElement('div');
    marker.className = `flow-marker flow-marker-${type}`;
    marker.style.position = 'absolute';
    marker.style.width = `${size}px`;
    marker.style.height = `${size}px`;
    marker.style.backgroundColor = color;
    marker.style.borderRadius = type === 'dot' ? '50%' : '0';
    marker.style.pointerEvents = 'none';
    marker.style.zIndex = '1000';
    marker.style.transition = 'none';
    marker.style.boxShadow = `0 0 ${size / 2}px ${color}`;
    
    if (type === 'arrow') {
      // Create arrow shape
      marker.style.clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
    }
    
    return marker;
  }

  /**
   * Animate marker along path points
   * @param {HTMLElement} marker
   * @param {Array<{x: number, y: number}>} points
   * @param {number} duration
   * @param {string} easing
   * @returns {Promise<void>}
   */
  animateAlongPath(marker, points, duration, easing) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const totalLength = this.calculatePathLength(points);
      let animationId = null;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing
        const easedProgress = this.ease(progress, easing);
        
        // Calculate position at current distance
        const distance = easedProgress * totalLength;
        const position = this.getPositionAtDistance(points, distance);
        
        // Update marker position (adjust for marker size)
        const markerSize = parseFloat(marker.style.width) || 12;
        marker.style.left = `${position.x - markerSize / 2}px`;
        marker.style.top = `${position.y - markerSize / 2}px`;
        
        // Update marker rotation for arrow type
        if (marker.classList.contains('flow-marker-arrow')) {
          marker.style.transform = `rotate(${position.angle}deg)`;
        }
        
        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
          // Store animation ID for potential cancellation
          this.activeAnimations.push(animationId);
        } else {
          resolve();
        }
      };
      
      animationId = requestAnimationFrame(animate);
      this.activeAnimations.push(animationId);
    });
  }

  /**
   * Calculate total path length
   * @param {Array<{x: number, y: number}>} points
   * @returns {number}
   */
  calculatePathLength(points) {
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    return totalLength;
  }

  /**
   * Get position along path at given distance
   * @param {Array<{x: number, y: number}>} points
   * @param {number} distance
   * @returns {{x: number, y: number, angle: number}}
   */
  getPositionAtDistance(points, distance) {
    let remainingDistance = distance;
    
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      
      if (remainingDistance <= segmentLength) {
        // Position is on this segment
        const t = remainingDistance / segmentLength;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        return { x, y, angle };
      }
      
      remainingDistance -= segmentLength;
    }
    
    // Return last point if distance exceeds path length
    const lastPoint = points[points.length - 1];
    const prevPoint = points[points.length - 2];
    const dx = lastPoint.x - prevPoint.x;
    const dy = lastPoint.y - prevPoint.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    return { x: lastPoint.x, y: lastPoint.y, angle };
  }

  /**
   * Easing functions
   * @param {number} t - Progress 0-1
   * @param {string} type - Easing type
   * @returns {number}
   */
  ease(t, type) {
    switch (type) {
      case 'linear':
        return t;
      case 'easeInOutCubic':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'easeOutQuad':
        return 1 - (1 - t) * (1 - t);
      case 'easeInQuad':
        return t * t;
      default:
        return t;
    }
  }

  /**
   * Cancel all active animations
   */
  cancelAll() {
    // Cancel all active animation frames
    this.activeAnimations.forEach(id => {
      if (id) cancelAnimationFrame(id);
    });
    
    // Remove all marker elements
    const markers = this.overlay.querySelectorAll('.flow-marker');
    markers.forEach(marker => marker.remove());
    
    this.activeAnimations = [];
  }
}

/**
 * @typedef {Object} AnimationOptions
 * @property {number} duration - Animation duration in ms
 * @property {string} color - Marker color
 * @property {'dot'|'arrow'|'packet'} markerType
 * @property {number} markerSize - Marker size in px
 * @property {string} easing - Easing function name
 */
