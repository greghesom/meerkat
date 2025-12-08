/**
 * DrawioLoader - Dynamically loads draw.io viewer script
 * 
 * @example
 * const loader = new DrawioLoader();
 * await loader.load();
 * console.log(window.GraphViewer); // Available
 */
export class DrawioLoader {
  constructor() {
    this.scriptUrl = 'https://viewer.diagrams.net/js/viewer-static.min.js';
    this.loaded = false;
    this.loadPromise = null;
  }

  /**
   * Load the draw.io viewer script
   * @returns {Promise<void>} Resolves when script is loaded
   */
  async load() {
    // Check if already loaded
    if (this.loaded || (typeof window !== 'undefined' && typeof window.GraphViewer !== 'undefined')) {
      this.loaded = true;
      return Promise.resolve();
    }

    // If load is already in progress, return existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Create and load script
    this.loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.scriptUrl;
      script.async = true;
      
      script.onload = () => {
        this.loaded = true;
        resolve();
      };
      
      script.onerror = () => {
        this.loadPromise = null;
        reject(new Error(`Failed to load draw.io viewer script from ${this.scriptUrl}`));
      };
      
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  /**
   * Check if viewer is ready
   * @returns {boolean}
   */
  isReady() {
    return this.loaded && typeof window !== 'undefined' && typeof window.GraphViewer !== 'undefined';
  }
}
