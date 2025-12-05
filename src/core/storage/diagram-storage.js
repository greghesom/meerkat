/**
 * Diagram Storage Service
 * Handles persistence of diagram modifications, comments, and edited steps
 * Uses localStorage with IndexedDB fallback for browser storage
 */

/**
 * Storage keys prefix to namespace our data
 */
const STORAGE_PREFIX = 'meerkat_';

/**
 * Storage keys for different data types
 */
const STORAGE_KEYS = {
  COMMENTS: 'comments',
  DIAGRAM_EDITS: 'diagram_edits',
  STEP_PROPERTIES: 'step_properties',
};

/**
 * DiagramStorage class - provides persistence for diagram data
 */
export class DiagramStorage {
  /**
   * Create a new DiagramStorage instance
   */
  constructor() {
    this.db = null;
    this.useIndexedDB = this._checkIndexedDBSupport();
  }

  /**
   * Check if IndexedDB is supported
   * @returns {boolean}
   */
  _checkIndexedDBSupport() {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
      return false;
    }
  }

  /**
   * Initialize storage (for IndexedDB)
   * @returns {Promise<void>}
   */
  async init() {
    if (!this.useIndexedDB) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MeerkatDB', 1);

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to localStorage');
        this.useIndexedDB = false;
        resolve();
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('comments')) {
          db.createObjectStore('comments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('diagramEdits')) {
          db.createObjectStore('diagramEdits', { keyPath: 'diagramId' });
        }
      };
    });
  }

  /**
   * Generate a unique key for a diagram + step combination
   * @param {string} diagramId - The diagram identifier
   * @param {number} stepIndex - The step index
   * @returns {string}
   */
  _getStepKey(diagramId, stepIndex) {
    return `${diagramId}_step_${stepIndex}`;
  }

  /**
   * Get all comments for a diagram
   * @param {string} diagramId - The diagram identifier
   * @returns {Promise<Object>} Map of stepIndex to comments array
   */
  async getComments(diagramId) {
    const key = `${STORAGE_PREFIX}${STORAGE_KEYS.COMMENTS}_${diagramId}`;
    
    try {
      if (this.useIndexedDB && this.db) {
        return await this._getFromIndexedDB('comments', diagramId) || {};
      }
      
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting comments:', error);
      return {};
    }
  }

  /**
   * Add a comment to a step
   * @param {string} diagramId - The diagram identifier
   * @param {number} stepIndex - The step index
   * @param {Object} comment - The comment object
   * @returns {Promise<void>}
   */
  async addComment(diagramId, stepIndex, comment) {
    const comments = await this.getComments(diagramId);
    
    if (!comments[stepIndex]) {
      comments[stepIndex] = [];
    }
    
    const newComment = {
      id: this._generateId(),
      text: comment.text,
      author: comment.author || 'Anonymous',
      timestamp: new Date().toISOString(),
      replies: [],
    };
    
    comments[stepIndex].push(newComment);
    
    await this._saveComments(diagramId, comments);
    return newComment;
  }

  /**
   * Add a reply to a comment
   * @param {string} diagramId - The diagram identifier
   * @param {number} stepIndex - The step index
   * @param {string} commentId - The parent comment ID
   * @param {Object} reply - The reply object
   * @returns {Promise<void>}
   */
  async addReply(diagramId, stepIndex, commentId, reply) {
    const comments = await this.getComments(diagramId);
    
    if (!comments[stepIndex]) {
      return null;
    }
    
    const comment = comments[stepIndex].find(c => c.id === commentId);
    if (!comment) {
      return null;
    }
    
    const newReply = {
      id: this._generateId(),
      text: reply.text,
      author: reply.author || 'Anonymous',
      timestamp: new Date().toISOString(),
    };
    
    comment.replies.push(newReply);
    
    await this._saveComments(diagramId, comments);
    return newReply;
  }

  /**
   * Delete a comment
   * @param {string} diagramId - The diagram identifier
   * @param {number} stepIndex - The step index
   * @param {string} commentId - The comment ID
   * @returns {Promise<boolean>}
   */
  async deleteComment(diagramId, stepIndex, commentId) {
    const comments = await this.getComments(diagramId);
    
    if (!comments[stepIndex]) {
      return false;
    }
    
    const index = comments[stepIndex].findIndex(c => c.id === commentId);
    if (index === -1) {
      return false;
    }
    
    comments[stepIndex].splice(index, 1);
    
    // Clean up empty arrays
    if (comments[stepIndex].length === 0) {
      delete comments[stepIndex];
    }
    
    await this._saveComments(diagramId, comments);
    return true;
  }

  /**
   * Get comment count for a step
   * @param {string} diagramId - The diagram identifier
   * @param {number} stepIndex - The step index
   * @returns {Promise<number>}
   */
  async getCommentCount(diagramId, stepIndex) {
    const comments = await this.getComments(diagramId);
    return (comments[stepIndex] || []).length;
  }

  /**
   * Save diagram edits (modified diagram source)
   * @param {string} diagramId - The diagram identifier
   * @param {string} source - The modified diagram source
   * @returns {Promise<void>}
   */
  async saveDiagramEdit(diagramId, source) {
    const key = `${STORAGE_PREFIX}${STORAGE_KEYS.DIAGRAM_EDITS}_${diagramId}`;
    
    const data = {
      diagramId,
      source,
      lastModified: new Date().toISOString(),
    };
    
    try {
      if (this.useIndexedDB && this.db) {
        await this._putToIndexedDB('diagramEdits', data);
      } else {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving diagram edit:', error);
    }
  }

  /**
   * Get saved diagram edits
   * @param {string} diagramId - The diagram identifier
   * @returns {Promise<Object|null>}
   */
  async getDiagramEdit(diagramId) {
    const key = `${STORAGE_PREFIX}${STORAGE_KEYS.DIAGRAM_EDITS}_${diagramId}`;
    
    try {
      if (this.useIndexedDB && this.db) {
        return await this._getFromIndexedDB('diagramEdits', diagramId);
      }
      
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting diagram edit:', error);
      return null;
    }
  }

  /**
   * Clear diagram edits (reset to original)
   * @param {string} diagramId - The diagram identifier
   * @returns {Promise<void>}
   */
  async clearDiagramEdit(diagramId) {
    const key = `${STORAGE_PREFIX}${STORAGE_KEYS.DIAGRAM_EDITS}_${diagramId}`;
    
    try {
      if (this.useIndexedDB && this.db) {
        await this._deleteFromIndexedDB('diagramEdits', diagramId);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error clearing diagram edit:', error);
    }
  }

  /**
   * Export diagram with comments as JSON
   * @param {string} diagramId - The diagram identifier
   * @param {Object} diagramData - The original diagram data
   * @returns {Promise<Object>}
   */
  async exportDiagram(diagramId, diagramData) {
    const comments = await this.getComments(diagramId);
    const edits = await this.getDiagramEdit(diagramId);
    
    return {
      ...diagramData,
      diagram: edits?.source || diagramData.diagram,
      comments,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Save comments to storage
   * @private
   * @param {string} diagramId - The diagram identifier
   * @param {Object} comments - The comments data
   * @returns {Promise<void>}
   */
  async _saveComments(diagramId, comments) {
    const key = `${STORAGE_PREFIX}${STORAGE_KEYS.COMMENTS}_${diagramId}`;
    
    try {
      if (this.useIndexedDB && this.db) {
        await this._putToIndexedDB('comments', { id: diagramId, data: comments });
      } else {
        localStorage.setItem(key, JSON.stringify(comments));
      }
    } catch (error) {
      console.error('Error saving comments:', error);
    }
  }

  /**
   * Get data from IndexedDB
   * @private
   * @param {string} storeName - The object store name
   * @param {string} key - The key to retrieve
   * @returns {Promise<any>}
   */
  _getFromIndexedDB(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (storeName === 'comments') {
          resolve(result?.data || null);
        } else {
          resolve(result || null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Put data to IndexedDB
   * @private
   * @param {string} storeName - The object store name
   * @param {Object} data - The data to store
   * @returns {Promise<void>}
   */
  _putToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete data from IndexedDB
   * @private
   * @param {string} storeName - The object store name
   * @param {string} key - The key to delete
   * @returns {Promise<void>}
   */
  _deleteFromIndexedDB(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generate a unique ID
   * @private
   * @returns {string}
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Export a singleton instance
export const diagramStorage = new DiagramStorage();
