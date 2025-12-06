/**
 * Copilot Panel Component for AI-assisted diagram editing
 * Integrates with GitHub Models Copilot API to provide natural language editing
 */

/**
 * Default configuration for the copilot panel
 */
const COPILOT_CONFIG = {
  apiEndpoint: 'https://models.inference.ai.azure.com/chat/completions',
  model: 'gpt-4o',
  maxTokens: 2048,
  temperature: 0.3,
};

/**
 * System prompt for the Copilot assistant
 */
const SYSTEM_PROMPT = `You are a helpful assistant that edits Meerkat sequence diagrams.
Meerkat uses an extended Mermaid syntax with the following features:

1. Basic syntax:
   - sequenceDiagram (required first line)
   - participant Name or participant Name as Alias
   - Source->>Target: Message (solid arrow)
   - Source-->>Target: Message (dashed arrow)
   - title: Diagram Title

2. Extended annotations (added after the message):
   - @path(METHOD /endpoint) - API path annotation (e.g., @path(GET /api/users))
   - @type(TYPE) - Request type (JSON, SOAP, XML, RFC_SAP, GraphQL, gRPC, BINARY)
   - @sync or @async - Synchronous/asynchronous indicator
   - @timeout(duration) - Expected response time (e.g., @timeout(100ms))
   - @queue(name) - Message queue name
   - @flow(flowId) - Assign message to a flow
   - @request{schema} - Request body schema hint
   - @response{schema} - Response body schema hint

3. Flow definitions (comments):
   - %%flow flow_id "Display Name" #color

When given an instruction to edit a diagram:
1. Understand the current diagram structure
2. Apply the requested changes
3. Return ONLY the complete modified diagram code without any explanation or markdown formatting
4. Preserve any existing annotations unless specifically asked to change them
5. Ensure the output is valid Meerkat/Mermaid syntax`;

/**
 * CopilotPanel class - provides AI-assisted editing interface
 */
export class CopilotPanel {
  /**
   * Create a new CopilotPanel
   * @param {HTMLElement|string} container - Container element or selector
   * @param {object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      apiKey: options.apiKey || null,
      apiEndpoint: options.apiEndpoint || COPILOT_CONFIG.apiEndpoint,
      model: options.model || COPILOT_CONFIG.model,
      maxTokens: options.maxTokens || COPILOT_CONFIG.maxTokens,
      temperature: options.temperature || COPILOT_CONFIG.temperature,
      onApplyEdit: options.onApplyEdit || null,
      getCurrentSource: options.getCurrentSource || null,
    };

    this.panelElement = null;
    this.inputElement = null;
    this.historyElement = null;
    this.isLoading = false;
    this.conversationHistory = [];

    this.init();
  }

  /**
   * Initialize the panel
   */
  init() {
    if (!this.container) return;

    this.addPanelStyles();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Render the panel UI
   */
  render() {
    this.container.innerHTML = '';

    this.panelElement = document.createElement('div');
    this.panelElement.className = 'copilot-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'copilot-header';
    header.innerHTML = `
      <div class="copilot-header-title">
        <svg class="copilot-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Copilot Assistant</span>
      </div>
      <div class="copilot-settings">
        <button id="copilot-settings-btn" class="copilot-btn copilot-btn-icon" title="Settings">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </div>
    `;
    this.panelElement.appendChild(header);

    // API Key Warning (shown when no key is configured)
    const apiWarning = document.createElement('div');
    apiWarning.id = 'copilot-api-warning';
    apiWarning.className = 'copilot-api-warning';
    apiWarning.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>
      <span>API key not configured. Click settings to add your GitHub Models API key.</span>
    `;
    if (!this.options.apiKey) {
      apiWarning.classList.add('visible');
    }
    this.panelElement.appendChild(apiWarning);

    // Conversation history
    this.historyElement = document.createElement('div');
    this.historyElement.className = 'copilot-history';
    this.historyElement.innerHTML = `
      <div class="copilot-welcome">
        <p>👋 Hi! I can help you edit your diagram. Try asking me to:</p>
        <ul>
          <li>"Add a new participant called Database"</li>
          <li>"Add an async message from API to Queue"</li>
          <li>"Add @type(JSON) to all messages"</li>
          <li>"Create a new flow called error_path"</li>
        </ul>
      </div>
    `;
    this.panelElement.appendChild(this.historyElement);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'copilot-input-area';
    inputArea.innerHTML = `
      <textarea id="copilot-input" class="copilot-input" placeholder="Describe the changes you want to make..." rows="2"></textarea>
      <button id="copilot-send-btn" class="copilot-btn copilot-btn-primary" title="Send">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    `;
    this.panelElement.appendChild(inputArea);

    // Settings modal
    const settingsModal = document.createElement('div');
    settingsModal.id = 'copilot-settings-modal';
    settingsModal.className = 'copilot-modal';
    settingsModal.innerHTML = `
      <div class="copilot-modal-content">
        <div class="copilot-modal-header">
          <span>Copilot Settings</span>
          <button id="copilot-modal-close" class="copilot-btn copilot-btn-icon">×</button>
        </div>
        <div class="copilot-modal-body">
          <label class="copilot-label">
            GitHub Models API Key
            <input type="password" id="copilot-api-key-input" class="copilot-text-input" placeholder="Enter your API key..." value="${this.options.apiKey || ''}">
          </label>
          <p class="copilot-help-text">
            Get your API key from <a href="https://github.com/marketplace/models" target="_blank" rel="noopener">GitHub Models</a>.
            The key is stored in your browser's local storage.
          </p>
          <label class="copilot-label">
            Model
            <select id="copilot-model-select" class="copilot-select">
              <option value="gpt-4o" ${this.options.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o</option>
              <option value="gpt-4o-mini" ${this.options.model === 'gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini</option>
            </select>
          </label>
        </div>
        <div class="copilot-modal-footer">
          <button id="copilot-settings-save" class="copilot-btn copilot-btn-primary">Save</button>
        </div>
      </div>
    `;
    this.panelElement.appendChild(settingsModal);

    this.container.appendChild(this.panelElement);

    // Store references
    this.inputElement = document.getElementById('copilot-input');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Send button
    const sendBtn = document.getElementById('copilot-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleSend());
    }

    // Input enter key
    if (this.inputElement) {
      this.inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('copilot-settings-btn');
    const settingsModal = document.getElementById('copilot-settings-modal');
    const modalClose = document.getElementById('copilot-modal-close');
    const settingsSave = document.getElementById('copilot-settings-save');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('visible');
      });
    }

    if (modalClose && settingsModal) {
      modalClose.addEventListener('click', () => {
        settingsModal.classList.remove('visible');
      });
    }

    if (settingsSave) {
      settingsSave.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    // Close modal on outside click
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          settingsModal.classList.remove('visible');
        }
      });
    }
  }

  /**
   * Handle send button click
   */
  async handleSend() {
    if (this.isLoading) return;

    const prompt = this.inputElement?.value?.trim();
    if (!prompt) return;

    if (!this.options.apiKey) {
      this.addMessage('system', 'Please configure your API key in the settings first.');
      return;
    }

    // Clear input
    this.inputElement.value = '';

    // Add user message to history
    this.addMessage('user', prompt);

    // Get current diagram source
    const currentSource = this.options.getCurrentSource?.() || '';

    // Send to API
    this.isLoading = true;
    this.addMessage('loading', 'Thinking...');

    try {
      const response = await this.callCopilotAPI(prompt, currentSource);
      
      // Remove loading message
      this.removeLoadingMessage();

      if (response.success) {
        // Add assistant response
        this.addMessage('assistant', 'Here are the changes I made:', response.content);
        
        // Apply the edit
        if (this.options.onApplyEdit) {
          this.options.onApplyEdit(response.content);
        }
      } else {
        this.addMessage('error', response.error || 'Failed to get response from Copilot.');
      }
    } catch (error) {
      this.removeLoadingMessage();
      this.addMessage('error', `Error: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Call the Copilot API
   * @param {string} userPrompt - User's instruction
   * @param {string} currentSource - Current diagram source
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  async callCopilotAPI(userPrompt, currentSource) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: `Current diagram:\n\`\`\`\n${currentSource}\n\`\`\`\n\nInstruction: ${userPrompt}\n\nPlease provide the updated diagram code only, without any markdown formatting or explanation.`
      }
    ];

    try {
      const response = await fetch(this.options.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: messages,
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('Empty response from API');
      }

      // Clean up the response (remove markdown code blocks if present)
      const cleanedContent = this.cleanCodeResponse(content);

      return { success: true, content: cleanedContent };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up code response by removing markdown formatting
   * @param {string} content - Raw response content
   * @returns {string} - Cleaned code
   */
  cleanCodeResponse(content) {
    // Remove markdown code blocks
    let cleaned = content.replace(/^```(?:mermaid|meerkat)?\n?/gm, '');
    cleaned = cleaned.replace(/\n?```$/gm, '');
    return cleaned.trim();
  }

  /**
   * Add a message to the conversation history
   * @param {string} type - Message type: 'user', 'assistant', 'system', 'error', 'loading'
   * @param {string} text - Message text
   * @param {string} code - Optional code content
   */
  addMessage(type, text, code = null) {
    // Remove welcome message on first interaction
    const welcome = this.historyElement?.querySelector('.copilot-welcome');
    if (welcome) {
      welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `copilot-message copilot-message-${type}`;
    
    if (type === 'loading') {
      messageDiv.id = 'copilot-loading-message';
      messageDiv.innerHTML = `
        <div class="copilot-loading-dots">
          <span></span><span></span><span></span>
        </div>
        <span>${text}</span>
      `;
    } else {
      let content = `<span class="copilot-message-text">${this.escapeHtml(text)}</span>`;
      
      if (code) {
        content += `
          <div class="copilot-code-preview">
            <pre>${this.escapeHtml(code.substring(0, 200))}${code.length > 200 ? '...' : ''}</pre>
          </div>
        `;
      }
      
      messageDiv.innerHTML = content;
    }

    this.historyElement?.appendChild(messageDiv);
    
    // Scroll to bottom
    if (this.historyElement) {
      this.historyElement.scrollTop = this.historyElement.scrollHeight;
    }
  }

  /**
   * Remove the loading message
   */
  removeLoadingMessage() {
    const loadingMsg = document.getElementById('copilot-loading-message');
    if (loadingMsg) {
      loadingMsg.remove();
    }
  }

  /**
   * Save settings from the modal
   */
  saveSettings() {
    const apiKeyInput = document.getElementById('copilot-api-key-input');
    const modelSelect = document.getElementById('copilot-model-select');
    const modal = document.getElementById('copilot-settings-modal');
    const warning = document.getElementById('copilot-api-warning');

    if (apiKeyInput) {
      this.options.apiKey = apiKeyInput.value.trim();
      // Save to local storage
      if (this.options.apiKey) {
        localStorage.setItem('meerkat_copilot_api_key', this.options.apiKey);
        warning?.classList.remove('visible');
      } else {
        localStorage.removeItem('meerkat_copilot_api_key');
        warning?.classList.add('visible');
      }
    }

    if (modelSelect) {
      this.options.model = modelSelect.value;
      localStorage.setItem('meerkat_copilot_model', this.options.model);
    }

    modal?.classList.remove('visible');
  }

  /**
   * Load settings from local storage
   */
  loadSettings() {
    const savedApiKey = localStorage.getItem('meerkat_copilot_api_key');
    const savedModel = localStorage.getItem('meerkat_copilot_model');

    if (savedApiKey) {
      this.options.apiKey = savedApiKey;
    }
    if (savedModel) {
      this.options.model = savedModel;
    }
  }

  /**
   * Set the API key programmatically
   * @param {string} apiKey - The API key
   */
  setApiKey(apiKey) {
    this.options.apiKey = apiKey;
    localStorage.setItem('meerkat_copilot_api_key', apiKey);
    
    const warning = document.getElementById('copilot-api-warning');
    const apiKeyInput = document.getElementById('copilot-api-key-input');
    
    if (apiKey) {
      warning?.classList.remove('visible');
    }
    if (apiKeyInput) {
      apiKeyInput.value = apiKey;
    }
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Add panel styles to the document
   */
  addPanelStyles() {
    const styleId = 'copilot-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .copilot-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
        color: #cccccc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
      }

      .copilot-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
      }

      .copilot-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #e0e0e0;
      }

      .copilot-icon {
        width: 18px;
        height: 18px;
        color: #7c3aed;
      }

      .copilot-api-warning {
        display: none;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(255, 193, 7, 0.1);
        border-bottom: 1px solid rgba(255, 193, 7, 0.3);
        color: #ffc107;
        font-size: 12px;
      }

      .copilot-api-warning.visible {
        display: flex;
      }

      .copilot-api-warning svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .copilot-history {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
      }

      .copilot-welcome {
        color: #888;
        font-size: 12px;
        line-height: 1.6;
      }

      .copilot-welcome p {
        margin-bottom: 8px;
      }

      .copilot-welcome ul {
        margin: 0;
        padding-left: 20px;
      }

      .copilot-welcome li {
        margin-bottom: 4px;
        color: #7c3aed;
      }

      .copilot-message {
        margin-bottom: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        word-wrap: break-word;
      }

      .copilot-message-user {
        background: #3c3c3c;
        margin-left: 20px;
      }

      .copilot-message-assistant {
        background: rgba(124, 58, 237, 0.15);
        border-left: 3px solid #7c3aed;
      }

      .copilot-message-system {
        background: rgba(59, 130, 246, 0.15);
        border-left: 3px solid #3b82f6;
        font-size: 12px;
      }

      .copilot-message-error {
        background: rgba(239, 68, 68, 0.15);
        border-left: 3px solid #ef4444;
        color: #f87171;
      }

      .copilot-message-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #888;
        font-style: italic;
      }

      .copilot-loading-dots {
        display: flex;
        gap: 4px;
      }

      .copilot-loading-dots span {
        width: 6px;
        height: 6px;
        background: #7c3aed;
        border-radius: 50%;
        animation: copilot-bounce 1.4s infinite ease-in-out both;
      }

      .copilot-loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .copilot-loading-dots span:nth-child(2) { animation-delay: -0.16s; }

      @keyframes copilot-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      .copilot-code-preview {
        margin-top: 8px;
        padding: 8px;
        background: #1a1a1a;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 11px;
        overflow-x: auto;
      }

      .copilot-code-preview pre {
        margin: 0;
        white-space: pre-wrap;
        color: #9cdcfe;
      }

      .copilot-input-area {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: #252526;
        border-top: 1px solid #3c3c3c;
      }

      .copilot-input {
        flex: 1;
        padding: 10px 12px;
        background: #3c3c3c;
        border: 1px solid #4c4c4c;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 13px;
        resize: none;
        outline: none;
        font-family: inherit;
      }

      .copilot-input:focus {
        border-color: #7c3aed;
      }

      .copilot-input::placeholder {
        color: #888;
      }

      .copilot-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .copilot-btn-icon {
        width: 32px;
        height: 32px;
        padding: 0;
        background: transparent;
        color: #888;
      }

      .copilot-btn-icon:hover {
        background: #3c3c3c;
        color: #e0e0e0;
      }

      .copilot-btn-icon svg {
        width: 16px;
        height: 16px;
      }

      .copilot-btn-primary {
        width: 40px;
        height: 40px;
        background: #7c3aed;
        color: white;
      }

      .copilot-btn-primary:hover {
        background: #6d28d9;
      }

      .copilot-btn-primary svg {
        width: 18px;
        height: 18px;
      }

      /* Modal styles */
      .copilot-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 1000;
        align-items: center;
        justify-content: center;
      }

      .copilot-modal.visible {
        display: flex;
      }

      .copilot-modal-content {
        background: #252526;
        border-radius: 8px;
        width: 400px;
        max-width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }

      .copilot-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #3c3c3c;
        font-weight: 500;
        color: #e0e0e0;
      }

      .copilot-modal-body {
        padding: 16px;
      }

      .copilot-modal-footer {
        display: flex;
        justify-content: flex-end;
        padding: 12px 16px;
        border-top: 1px solid #3c3c3c;
      }

      .copilot-label {
        display: block;
        margin-bottom: 16px;
        font-size: 12px;
        color: #888;
      }

      .copilot-text-input,
      .copilot-select {
        display: block;
        width: 100%;
        margin-top: 6px;
        padding: 10px 12px;
        background: #3c3c3c;
        border: 1px solid #4c4c4c;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 13px;
        outline: none;
      }

      .copilot-text-input:focus,
      .copilot-select:focus {
        border-color: #7c3aed;
      }

      .copilot-help-text {
        font-size: 11px;
        color: #666;
        margin-bottom: 16px;
        line-height: 1.5;
      }

      .copilot-help-text a {
        color: #7c3aed;
        text-decoration: none;
      }

      .copilot-help-text a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destroy the panel and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.panelElement = null;
    this.inputElement = null;
    this.historyElement = null;
  }
}
