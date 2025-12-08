/**
 * MappingStore - Manages participant-to-shape mappings with persistence
 */
export class MappingStore extends EventTarget {
  /**
   * @param {string} configId - Unique ID for localStorage key
   */
  constructor(configId) {
    super();
    this.configId = configId;
    this.storageKey = `meerkat-diagram-mapping-${configId}`;
    this.mappings = new Map();
    this.autoSave = true;
  }

  /**
   * Set a mapping
   * @param {string} participantId
   * @param {string} shapeId
   * @param {Object} metadata - Additional metadata
   */
  setMapping(participantId, shapeId, metadata = {}) {
    const entry = {
      participantId,
      shapeId,
      ...metadata,
      mappedAt: new Date().toISOString()
    };
    
    this.mappings.set(participantId, entry);
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('mapping-changed', {
      detail: { participantId, shapeId, entry }
    }));
    
    // Auto-save if enabled
    if (this.autoSave) {
      this.save();
    }
  }

  /**
   * Get mapping for participant
   * @param {string} participantId
   * @returns {MappingEntry|null}
   */
  getMapping(participantId) {
    return this.mappings.get(participantId) || null;
  }

  /**
   * Get shape ID for participant
   * @param {string} participantId
   * @returns {string|null}
   */
  getShapeId(participantId) {
    return this.mappings.get(participantId)?.shapeId || null;
  }

  /**
   * Clear mapping for participant
   * @param {string} participantId
   */
  clearMapping(participantId) {
    this.mappings.delete(participantId);
    
    this.dispatchEvent(new CustomEvent('mapping-cleared', {
      detail: { participantId }
    }));
    
    if (this.autoSave) {
      this.save();
    }
  }

  /**
   * Clear all mappings
   */
  clearAll() {
    this.mappings.clear();
    
    this.dispatchEvent(new CustomEvent('mappings-cleared'));
    
    if (this.autoSave) {
      this.save();
    }
  }

  /**
   * Bulk set mappings from auto-mapper result
   * @param {Array<Mapping>} mappings
   */
  setFromAutoMapper(mappings) {
    for (const mapping of mappings) {
      const entry = {
        participantId: mapping.participantId,
        shapeId: mapping.shapeId,
        shapeLabel: mapping.shapeLabel,
        autoMapped: mapping.autoMapped,
        confidence: mapping.confidence,
        mappedAt: new Date().toISOString()
      };
      this.mappings.set(mapping.participantId, entry);
    }
    
    this.dispatchEvent(new CustomEvent('mappings-updated'));
    
    if (this.autoSave) {
      this.save();
    }
  }

  /**
   * Save to localStorage
   */
  save() {
    const data = {
      configId: this.configId,
      mappings: Array.from(this.mappings.entries()),
      savedAt: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save mappings to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   * @returns {boolean} True if loaded successfully
   */
  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return false;
      
      const data = JSON.parse(stored);
      if (data.configId !== this.configId) return false;
      
      this.mappings = new Map(data.mappings);
      
      this.dispatchEvent(new CustomEvent('mappings-loaded'));
      
      return true;
    } catch (error) {
      console.error('Failed to load mappings from localStorage:', error);
      return false;
    }
  }

  /**
   * Export mappings as JSON
   * @returns {string}
   */
  export() {
    const data = {
      configId: this.configId,
      mappings: Array.from(this.mappings.entries()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import mappings from JSON
   * @param {string} json
   */
  import(json) {
    try {
      const data = JSON.parse(json);
      this.mappings = new Map(data.mappings);
      
      this.dispatchEvent(new CustomEvent('mappings-imported'));
      
      if (this.autoSave) {
        this.save();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import mappings:', error);
      return false;
    }
  }

  /**
   * Get all mappings as array
   * @returns {Array<MappingEntry>}
   */
  getAll() {
    return Array.from(this.mappings.values());
  }

  /**
   * Check if all participants are mapped
   * @param {Array<string>} participantIds
   * @returns {boolean}
   */
  isComplete(participantIds) {
    return participantIds.every(id => this.mappings.has(id));
  }
}

/**
 * @typedef {Object} MappingEntry
 * @property {string} participantId
 * @property {string} shapeId
 * @property {string} shapeLabel
 * @property {boolean} autoMapped
 * @property {number} confidence
 * @property {string} mappedAt - ISO timestamp
 */
