/**
 * AutoMapper - Automatically maps participants to shapes by label matching
 */
export class AutoMapper {
  /**
   * Map participants to shapes
   * @param {Array<Participant>} participants - From sequence AST
   * @param {Array<ShapeInfo>} shapes - From ShapeExtractor
   * @returns {MappingResult}
   */
  map(participants, shapes) {
    const mappings = [];
    const unmapped = [];
    const ambiguous = [];

    for (const participant of participants) {
      // Check if participant has explicit shapeId annotation
      if (participant.shapeId) {
        const shape = shapes.find(s => s.id === participant.shapeId);
        if (shape) {
          mappings.push({
            participantId: participant.id,
            participantName: participant.displayName || participant.id,
            shapeId: shape.id,
            shapeLabel: shape.label,
            confidence: 1.0,
            autoMapped: false
          });
          continue;
        }
      }

      // Find matching shapes
      const matches = this.findMatches(participant, shapes);

      if (matches.length === 1) {
        // Exactly one match
        mappings.push({
          participantId: participant.id,
          participantName: participant.displayName || participant.id,
          shapeId: matches[0].shape.id,
          shapeLabel: matches[0].shape.label,
          confidence: matches[0].confidence,
          autoMapped: true
        });
      } else if (matches.length === 0) {
        // No matches
        unmapped.push({
          participant,
          reason: 'No matching shapes found'
        });
      } else {
        // Multiple matches - ambiguous
        ambiguous.push({
          participant,
          candidates: matches.map(m => m.shape)
        });
      }
    }

    return { mappings, unmapped, ambiguous };
  }

  /**
   * Find shapes matching a participant
   * @param {Participant} participant
   * @param {Array<ShapeInfo>} shapes
   * @returns {Array<{shape: ShapeInfo, confidence: number}>}
   */
  findMatches(participant, shapes) {
    const matches = [];
    
    // Build search terms from participant
    const searchTerms = [
      participant.id.toLowerCase(),
      (participant.displayName || '').toLowerCase()
    ].filter(t => t);

    for (const shape of shapes) {
      const maxConfidence = Math.max(
        ...searchTerms.map(term => this.calculateConfidence(term, shape))
      );
      
      if (maxConfidence > 0) {
        matches.push({ shape, confidence: maxConfidence });
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    // Filter to only keep high-confidence matches (> 0.5)
    return matches.filter(m => m.confidence > 0.5);
  }

  /**
   * Calculate confidence score for a match
   * @param {string} term - Search term (lowercase)
   * @param {ShapeInfo} shape
   * @returns {number} 0-1 confidence score
   */
  calculateConfidence(term, shape) {
    if (!term || !shape.label) return 0;

    const shapeLabel = shape.label.toLowerCase();
    const shapeId = shape.id.toLowerCase();

    // Exact label match
    if (shapeLabel === term) {
      return 1.0;
    }

    // Exact ID match
    if (shapeId === term) {
      return 0.95;
    }

    // Label contains term
    if (shapeLabel.includes(term)) {
      return 0.7;
    }

    // Term contains label
    if (term.includes(shapeLabel)) {
      return 0.6;
    }

    // Fuzzy match - check word boundaries
    const shapeWords = shapeLabel.split(/\s+|_|-/);
    const termWords = term.split(/\s+|_|-/);
    
    // Check if any words match
    for (const shapeWord of shapeWords) {
      for (const termWord of termWords) {
        if (shapeWord === termWord && shapeWord.length > 2) {
          return 0.5;
        }
      }
    }

    return 0;
  }
}

/**
 * @typedef {Object} Participant
 * @property {string} id - Participant ID from sequence diagram
 * @property {string} [displayName] - Display name (alias)
 * @property {string} [shapeId] - Explicit shape ID from @shapeId annotation
 */

/**
 * @typedef {Object} MappingResult
 * @property {Array<Mapping>} mappings - Successful mappings
 * @property {Array<{participant: Participant, reason: string}>} unmapped
 * @property {Array<{participant: Participant, candidates: Array<ShapeInfo>}>} ambiguous
 */

/**
 * @typedef {Object} Mapping
 * @property {string} participantId
 * @property {string} participantName
 * @property {string} shapeId
 * @property {string} shapeLabel
 * @property {number} confidence
 * @property {boolean} autoMapped
 */
