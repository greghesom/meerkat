/**
 * Comment Panel Component
 * Provides UI for viewing, adding, and managing comments on diagram steps
 */

import { diagramStorage } from '../storage/diagram-storage.js';

/**
 * Comment Panel Configuration
 */
const PANEL_CONFIG = {
  maxWidth: 400,
  minWidth: 300,
  animationDuration: 200,
};

/**
 * CommentPanel class - displays and manages comments for diagram steps
 */
export class CommentPanel {
  /**
   * Create a new CommentPanel
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      diagramId: options.diagramId || 'default',
      onCommentAdded: options.onCommentAdded || null,
      onCommentDeleted: options.onCommentDeleted || null,
      ...options,
    };

    this.currentStepIndex = null;
    this.currentStepMessage = null;
    this.panelElement = null;
    this.isVisible = false;
    
    this.init();
  }

  /**
   * Initialize the comment panel
   */
  async init() {
    await diagramStorage.init();
    this.render();
  }

  /**
   * Render the comment panel
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = '';

    this.panelElement = document.createElement('div');
    this.panelElement.className = 'comment-panel';
    this.panelElement.style.cssText = `
      display: none;
      flex-direction: column;
      width: ${PANEL_CONFIG.maxWidth}px;
      max-width: ${PANEL_CONFIG.maxWidth}px;
      min-width: ${PANEL_CONFIG.minWidth}px;
      background: #ffffff;
      border-left: 1px solid #e9ecef;
      overflow: hidden;
      transition: opacity ${PANEL_CONFIG.animationDuration}ms ease;
    `;

    this.showPlaceholder();
    this.container.appendChild(this.panelElement);
  }

  /**
   * Show placeholder when no step is selected
   */
  showPlaceholder() {
    if (!this.panelElement) return;

    this.panelElement.innerHTML = `
      <div class="comment-panel-header" style="
        padding: 16px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <h3 style="
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        ">Comments</h3>
        <button class="comment-panel-close" style="
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: #666;
          padding: 0 4px;
        " title="Close">×</button>
      </div>
      <div style="
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: #6c757d;
      ">
        <div>
          <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
          <p style="margin: 0; font-size: 14px;">Click on a step to view or add comments</p>
        </div>
      </div>
    `;

    this._bindCloseButton();
  }

  /**
   * Show the comment panel for a specific step
   * @param {number} stepIndex - The step index (0-based)
   * @param {Object} message - The message object from AST
   */
  async show(stepIndex, message) {
    this.currentStepIndex = stepIndex;
    this.currentStepMessage = message;

    const comments = await diagramStorage.getComments(this.options.diagramId);
    const stepComments = comments[stepIndex] || [];

    this.renderStepComments(stepIndex, message, stepComments);
    
    this.panelElement.style.display = 'flex';
    this.isVisible = true;
  }

  /**
   * Hide the comment panel
   */
  hide() {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
    this.isVisible = false;
    this.currentStepIndex = null;
    this.currentStepMessage = null;
  }

  /**
   * Render comments for a specific step
   * @param {number} stepIndex - The step index
   * @param {Object} message - The message object
   * @param {Array} comments - Array of comments
   */
  renderStepComments(stepIndex, message, comments) {
    if (!this.panelElement) return;

    const stepNumber = stepIndex + 1;
    const messageText = this._escapeHtml(message?.text || 'Step');

    this.panelElement.innerHTML = `
      <div class="comment-panel-header" style="
        padding: 16px;
        border-bottom: 1px solid #e9ecef;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="
              background: #3b82f6;
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            ">Step ${stepNumber}</span>
            <span style="
              font-size: 14px;
              font-weight: 600;
              color: #333;
            ">Comments</span>
          </div>
          <button class="comment-panel-close" style="
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            color: #666;
            padding: 0 4px;
          " title="Close">×</button>
        </div>
        <div style="
          font-size: 13px;
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${messageText}</div>
      </div>
      
      <div class="comments-list" style="
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
      ">
        ${comments.length > 0 
          ? comments.map(c => this._renderComment(c, stepIndex)).join('')
          : `<div style="
              text-align: center;
              color: #6c757d;
              padding: 20px;
            ">
              <p style="margin: 0; font-size: 13px;">No comments yet</p>
              <p style="margin: 4px 0 0 0; font-size: 12px;">Be the first to add a comment!</p>
            </div>`
        }
      </div>
      
      <div class="add-comment-form" style="
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
        background: #f8f9fa;
      ">
        <textarea 
          class="comment-input"
          placeholder="Add a comment..."
          style="
            width: 100%;
            min-height: 60px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            resize: vertical;
            font-size: 13px;
            font-family: inherit;
            box-sizing: border-box;
          "
        ></textarea>
        <div style="
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
        ">
          <button class="add-comment-btn" style="
            padding: 8px 16px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
          ">Add Comment</button>
        </div>
      </div>
    `;

    this._bindEventListeners();
  }

  /**
   * Render a single comment
   * @param {Object} comment - The comment object
   * @param {number} stepIndex - The step index
   * @returns {string} HTML string
   */
  _renderComment(comment, stepIndex) {
    const date = new Date(comment.timestamp);
    const timeStr = this._formatTimeAgo(date);

    return `
      <div class="comment-item" data-comment-id="${comment.id}" style="
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 10px;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <div style="
              width: 28px;
              height: 28px;
              background: #3b82f6;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: 600;
            ">${this._getInitials(comment.author)}</div>
            <div>
              <div style="font-size: 13px; font-weight: 500; color: #333;">${this._escapeHtml(comment.author)}</div>
              <div style="font-size: 11px; color: #888;">${timeStr}</div>
            </div>
          </div>
          <button class="delete-comment-btn" data-comment-id="${comment.id}" style="
            background: none;
            border: none;
            cursor: pointer;
            color: #999;
            font-size: 14px;
            padding: 2px 6px;
          " title="Delete">🗑</button>
        </div>
        <div style="
          font-size: 13px;
          color: #333;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        ">${this._escapeHtml(comment.text)}</div>
        ${comment.replies && comment.replies.length > 0 
          ? `<div class="comment-replies" style="margin-top: 12px; margin-left: 16px; border-left: 2px solid #ddd; padding-left: 12px;">
              ${comment.replies.map(r => this._renderReply(r)).join('')}
            </div>`
          : ''
        }
        <div style="margin-top: 8px;">
          <button class="reply-btn" data-comment-id="${comment.id}" style="
            background: none;
            border: none;
            cursor: pointer;
            color: #3b82f6;
            font-size: 12px;
            padding: 0;
          ">Reply</button>
        </div>
      </div>
    `;
  }

  /**
   * Render a reply
   * @param {Object} reply - The reply object
   * @returns {string} HTML string
   */
  _renderReply(reply) {
    const date = new Date(reply.timestamp);
    const timeStr = this._formatTimeAgo(date);

    return `
      <div class="reply-item" style="
        padding: 8px 0;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        ">
          <div style="
            width: 22px;
            height: 22px;
            background: #6b7280;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
            font-weight: 600;
          ">${this._getInitials(reply.author)}</div>
          <span style="font-size: 12px; font-weight: 500; color: #333;">${this._escapeHtml(reply.author)}</span>
          <span style="font-size: 10px; color: #888;">${timeStr}</span>
        </div>
        <div style="
          font-size: 12px;
          color: #333;
          line-height: 1.4;
          white-space: pre-wrap;
        ">${this._escapeHtml(reply.text)}</div>
      </div>
    `;
  }

  /**
   * Bind event listeners
   */
  _bindEventListeners() {
    this._bindCloseButton();
    this._bindAddCommentButton();
    this._bindDeleteButtons();
    this._bindReplyButtons();
  }

  /**
   * Bind close button
   */
  _bindCloseButton() {
    const closeBtn = this.panelElement?.querySelector('.comment-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
  }

  /**
   * Bind add comment button
   */
  _bindAddCommentButton() {
    const addBtn = this.panelElement?.querySelector('.add-comment-btn');
    const input = this.panelElement?.querySelector('.comment-input');
    
    if (addBtn && input) {
      addBtn.addEventListener('click', async () => {
        const text = input.value.trim();
        if (!text) return;

        await this.addComment(text);
        input.value = '';
      });

      // Allow Ctrl+Enter to submit
      input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          const text = input.value.trim();
          if (!text) return;
          await this.addComment(text);
          input.value = '';
        }
      });
    }
  }

  /**
   * Bind delete buttons
   */
  _bindDeleteButtons() {
    const deleteButtons = this.panelElement?.querySelectorAll('.delete-comment-btn');
    deleteButtons?.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const commentId = e.target.getAttribute('data-comment-id');
        if (commentId && confirm('Delete this comment?')) {
          await this.deleteComment(commentId);
        }
      });
    });
  }

  /**
   * Bind reply buttons
   */
  _bindReplyButtons() {
    const replyButtons = this.panelElement?.querySelectorAll('.reply-btn');
    replyButtons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const commentId = e.target.getAttribute('data-comment-id');
        this._showReplyForm(commentId);
      });
    });
  }

  /**
   * Show reply form for a comment
   * @param {string} commentId - The comment ID
   */
  _showReplyForm(commentId) {
    const commentItem = this.panelElement?.querySelector(`[data-comment-id="${commentId}"]`);
    if (!commentItem) return;

    // Check if reply form already exists
    if (commentItem.querySelector('.reply-form')) return;

    const replyBtn = commentItem.querySelector('.reply-btn');
    const replyForm = document.createElement('div');
    replyForm.className = 'reply-form';
    replyForm.innerHTML = `
      <textarea 
        class="reply-input"
        placeholder="Write a reply..."
        style="
          width: 100%;
          min-height: 50px;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          resize: none;
          font-size: 12px;
          font-family: inherit;
          box-sizing: border-box;
          margin-top: 8px;
        "
      ></textarea>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
        <button class="cancel-reply-btn" style="
          padding: 4px 10px;
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Cancel</button>
        <button class="submit-reply-btn" style="
          padding: 4px 10px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Reply</button>
      </div>
    `;

    replyBtn.style.display = 'none';
    replyBtn.parentNode.insertBefore(replyForm, replyBtn.nextSibling);

    const input = replyForm.querySelector('.reply-input');
    input.focus();

    replyForm.querySelector('.cancel-reply-btn').addEventListener('click', () => {
      replyForm.remove();
      replyBtn.style.display = '';
    });

    replyForm.querySelector('.submit-reply-btn').addEventListener('click', async () => {
      const text = input.value.trim();
      if (!text) return;
      await this.addReply(commentId, text);
    });
  }

  /**
   * Add a comment to the current step
   * @param {string} text - The comment text
   */
  async addComment(text) {
    if (this.currentStepIndex === null) return;

    const newComment = await diagramStorage.addComment(
      this.options.diagramId,
      this.currentStepIndex,
      { text, author: 'You' }
    );

    // Refresh the panel
    await this.show(this.currentStepIndex, this.currentStepMessage);

    // Trigger callback
    if (this.options.onCommentAdded) {
      this.options.onCommentAdded(this.currentStepIndex, newComment);
    }
  }

  /**
   * Add a reply to a comment
   * @param {string} commentId - The parent comment ID
   * @param {string} text - The reply text
   */
  async addReply(commentId, text) {
    if (this.currentStepIndex === null) return;

    await diagramStorage.addReply(
      this.options.diagramId,
      this.currentStepIndex,
      commentId,
      { text, author: 'You' }
    );

    // Refresh the panel
    await this.show(this.currentStepIndex, this.currentStepMessage);
  }

  /**
   * Delete a comment
   * @param {string} commentId - The comment ID
   */
  async deleteComment(commentId) {
    if (this.currentStepIndex === null) return;

    const success = await diagramStorage.deleteComment(
      this.options.diagramId,
      this.currentStepIndex,
      commentId
    );

    if (success) {
      // Refresh the panel
      await this.show(this.currentStepIndex, this.currentStepMessage);

      // Trigger callback
      if (this.options.onCommentDeleted) {
        this.options.onCommentDeleted(this.currentStepIndex, commentId);
      }
    }
  }

  /**
   * Set the diagram ID
   * @param {string} diagramId - The diagram identifier
   */
  setDiagramId(diagramId) {
    this.options.diagramId = diagramId;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string}
   */
  _escapeHtml(text) {
    if (text == null) return '';
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Get initials from a name
   * @param {string} name - The name
   * @returns {string}
   */
  _getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  /**
   * Format a date as time ago string
   * @param {Date} date - The date
   * @returns {string}
   */
  _formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Destroy the panel
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.panelElement = null;
    this.currentStepIndex = null;
    this.currentStepMessage = null;
  }
}
