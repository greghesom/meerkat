import { DrawioLoader } from './drawio-loader.js';

/**
 * DrawioRenderer - Renders .drawio XML files using draw.io viewer
 */
export class DrawioRenderer {
  /**
   * @param {HTMLElement} container - Container element for the diagram
   */
  constructor(container) {
    this.container = container;
    this.loader = new DrawioLoader();
    this.graph = null;
    this.graphReadyPromise = null;
  }

  /**
   * Render a .drawio XML file
   * @param {string} xmlContent - The .drawio XML content
   * @param {Object} options - Render options
   * @param {number} options.pageIndex - Page to render (default: 0)
   * @returns {Promise<Object>} The mxGraph instance
   */
  async render(xmlContent, options = {}) {
    const { pageIndex = 0 } = options;

    // Ensure loader is ready
    await this.loader.load();

    // Clear container
    this.container.innerHTML = '';

    // Detect if content is compressed
    let decompressed = xmlContent;
    if (!xmlContent.trim().startsWith('<')) {
      // Content appears to be compressed (base64)
      try {
        decompressed = this.decompress(xmlContent);
      } catch (error) {
        console.error('Failed to decompress diagram:', error);
        throw new Error('Failed to decompress diagram content');
      }
    }

    // Create config object for GraphViewer
    const config = {
      highlight: '#0000ff',
      nav: true,
      resize: true,
      toolbar: 'zoom',
      edit: '_blank',
      xml: decompressed,
      page: pageIndex
    };

    // Create div with mxgraph class and data attribute
    const div = document.createElement('div');
    div.className = 'mxgraph';
    div.setAttribute('data-mxgraph', JSON.stringify(config));
    div.style.width = '100%';
    div.style.height = '100%';
    this.container.appendChild(div);

    // Call GraphViewer to process the element
    if (window.GraphViewer) {
      window.GraphViewer.processElements(this.container);
    }

    // Wait for graph instance to be available
    await this.waitForGraph();

    return this.graph;
  }

  /**
   * Wait for the mxGraph instance to be available
   * @returns {Promise<Object>}
   */
  async waitForGraph() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const checkGraph = () => {
        // Try to find the graph instance
        const divs = this.container.querySelectorAll('div[data-mxgraph]');
        for (const div of divs) {
          // Check if graph is attached to the div
          if (div.graph) {
            this.graph = div.graph;
            resolve(this.graph);
            return;
          }
        }

        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('Timeout waiting for graph to initialize'));
          return;
        }

        setTimeout(checkGraph, 100);
      };

      checkGraph();
    });
  }

  /**
   * Decompress deflate+base64 encoded diagram content
   * @param {string} compressed - Compressed content
   * @returns {string} Decompressed XML
   */
  decompress(compressed) {
    try {
      // Remove any whitespace
      const trimmed = compressed.trim();
      
      // Base64 decode
      const decoded = atob(trimmed);
      
      // URL decode
      const urlDecoded = decodeURIComponent(decoded);
      
      // For draw.io format, we might need pako for deflate
      // For now, try to use the decoded string as-is
      // If it starts with XML, it's already decompressed
      if (urlDecoded.trim().startsWith('<')) {
        return urlDecoded;
      }
      
      // Otherwise, return the original - might need additional handling
      return decoded;
    } catch (error) {
      console.error('Decompression error:', error);
      throw new Error('Failed to decompress diagram content');
    }
  }

  /**
   * Get the mxGraph instance
   * @returns {Object|null}
   */
  getGraph() {
    return this.graph;
  }

  /**
   * Get the graph model
   * @returns {Object|null}
   */
  getModel() {
    return this.graph?.getModel() || null;
  }

  /**
   * Get the graph view
   * @returns {Object|null}
   */
  getView() {
    return this.graph?.view || null;
  }

  /**
   * Fit diagram to container
   */
  fitToContainer() {
    if (this.graph) {
      this.graph.fit();
      this.graph.center();
    }
  }
}
