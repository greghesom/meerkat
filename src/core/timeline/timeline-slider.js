/**
 * Timeline Slider Control for sequence diagram step navigation
 * Provides a horizontal slider to scrub through sequence diagram messages/steps
 */

// Import StepState from svg-renderer to maintain a single source of truth
import { StepState } from '../renderer/svg-renderer.js';

// Re-export for convenience
export { StepState };

/**
 * Timeline Slider Configuration
 */
const SLIDER_CONFIG = {
  height: 60,          // Total height of timeline area
  trackHeight: 6,      // Height of the slider track
  thumbSize: 18,       // Size of the slider thumb
  padding: 40,         // Left/right padding to align with diagram
  stepMarkerSize: 8,   // Size of step markers on the track
  labelFontSize: 12,   // Font size for step labels
  infoFontSize: 14,    // Font size for "Step X of Y" display
};

/**
 * TimelineSlider class - provides interactive step navigation
 */
export class TimelineSlider {
  /**
   * Create a new TimelineSlider
   * @param {HTMLElement|string} container - Container element or selector for the slider
   * @param {object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      padding: options.padding || SLIDER_CONFIG.padding,
      height: options.height || SLIDER_CONFIG.height,
      trackHeight: options.trackHeight || SLIDER_CONFIG.trackHeight,
      thumbSize: options.thumbSize || SLIDER_CONFIG.thumbSize,
      stepMarkerSize: options.stepMarkerSize || SLIDER_CONFIG.stepMarkerSize,
      onChange: options.onChange || null,
      onAutoScrollChange: options.onAutoScrollChange || null,
      autoScrollEnabled: options.autoScrollEnabled !== undefined ? options.autoScrollEnabled : true,
      ...options,
    };

    this.totalSteps = 0;
    this.currentStep = 0;
    this.sliderElement = null;
    this.infoElement = null;
    this.autoScrollEnabled = this.options.autoScrollEnabled;
    this.autoScrollToggle = null;
  }

  /**
   * Initialize the timeline slider with the given number of steps
   * @param {number} totalSteps - Total number of steps/messages in the diagram
   */
  init(totalSteps) {
    this.totalSteps = totalSteps;
    this.currentStep = totalSteps; // Start showing all steps

    this.render();
  }

  /**
   * Render the timeline slider UI
   */
  render() {
    if (!this.container) return;

    // Clear existing content
    this.container.innerHTML = '';

    // Create wrapper element
    const wrapper = document.createElement('div');
    wrapper.className = 'timeline-slider-wrapper';
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 15px ${this.options.padding}px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      border-radius: 0 0 8px 8px;
    `;

    // Create step info display
    this.infoElement = document.createElement('div');
    this.infoElement.className = 'timeline-step-info';
    this.infoElement.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${SLIDER_CONFIG.infoFontSize}px;
      font-weight: 500;
      color: #495057;
      min-width: 100px;
      white-space: nowrap;
    `;
    this.updateStepInfo();
    wrapper.appendChild(this.infoElement);

    // Create slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'timeline-slider-container';
    sliderContainer.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
    `;

    // Create the range slider
    this.sliderElement = document.createElement('input');
    this.sliderElement.type = 'range';
    this.sliderElement.className = 'timeline-slider';
    this.sliderElement.min = '0';
    this.sliderElement.max = String(this.totalSteps);
    this.sliderElement.value = String(this.currentStep);
    this.sliderElement.style.cssText = `
      flex: 1;
      height: ${this.options.trackHeight}px;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${this.getProgressPercent()}%, #dee2e6 ${this.getProgressPercent()}%, #dee2e6 100%);
      border-radius: 3px;
      outline: none;
    `;

    // Add event listener for slider changes
    this.sliderElement.addEventListener('input', (e) => {
      this.currentStep = parseInt(e.target.value, 10);
      this.updateSliderStyle();
      this.updateStepInfo();
      this.triggerChange();
    });

    sliderContainer.appendChild(this.sliderElement);
    wrapper.appendChild(sliderContainer);

    // Create control buttons
    const controls = this.createControlButtons();
    wrapper.appendChild(controls);

    // Create auto-scroll toggle
    const autoScrollToggle = this.createAutoScrollToggle();
    wrapper.appendChild(autoScrollToggle);

    this.container.appendChild(wrapper);

    // Add custom slider styles
    this.addSliderStyles();
  }

  /**
   * Create control buttons (prev, next, play)
   * @returns {HTMLElement} - Control buttons container
   */
  createControlButtons() {
    const controls = document.createElement('div');
    controls.className = 'timeline-controls';
    controls.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    // Use simple text characters that render consistently across browsers
    // First step button
    const firstBtn = this.createButton('|◄', 'First step', () => this.goToStep(0));
    controls.appendChild(firstBtn);

    // Previous step button
    const prevBtn = this.createButton('◄', 'Previous step', () => this.previousStep());
    controls.appendChild(prevBtn);

    // Next step button
    const nextBtn = this.createButton('►', 'Next step', () => this.nextStep());
    controls.appendChild(nextBtn);

    // Last step button
    const lastBtn = this.createButton('►|', 'Last step', () => this.goToStep(this.totalSteps));
    controls.appendChild(lastBtn);

    return controls;
  }

  /**
   * Create a control button
   * @param {string} text - Button text
   * @param {string} title - Button tooltip
   * @param {function} onClick - Click handler
   * @returns {HTMLElement} - Button element
   */
  createButton(text, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'timeline-btn';
    btn.textContent = text;
    btn.title = title;
    btn.style.cssText = `
      min-width: 36px;
      height: 32px;
      padding: 0 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      font-family: Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      color: #495057;
    `;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#e9ecef';
      btn.style.borderColor = '#adb5bd';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'white';
      btn.style.borderColor = '#ced4da';
    });
    return btn;
  }

  /**
   * Create auto-scroll toggle
   * @returns {HTMLElement} - Auto-scroll toggle element
   */
  createAutoScrollToggle() {
    const toggle = document.createElement('label');
    toggle.className = 'auto-scroll-toggle' + (this.autoScrollEnabled ? ' active' : '');
    toggle.title = 'Auto-scroll to keep current step in view';
    toggle.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: ${this.autoScrollEnabled ? '#e0f2fe' : '#fff'};
      border: 1px solid ${this.autoScrollEnabled ? '#3b82f6' : '#ddd'};
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: ${this.autoScrollEnabled ? '#1d4ed8' : '#333'};
      transition: all 0.15s ease;
      user-select: none;
      margin-left: 8px;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.autoScrollEnabled;
    checkbox.style.display = 'none';

    const indicator = document.createElement('span');
    indicator.className = 'toggle-indicator';
    indicator.style.cssText = `
      width: 28px;
      height: 16px;
      background: ${this.autoScrollEnabled ? '#3b82f6' : '#ccc'};
      border-radius: 8px;
      position: relative;
      transition: background 0.2s ease;
    `;

    const knob = document.createElement('span');
    knob.style.cssText = `
      content: '';
      position: absolute;
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      top: 2px;
      left: ${this.autoScrollEnabled ? '14px' : '2px'};
      transition: left 0.2s ease;
    `;
    indicator.appendChild(knob);

    const label = document.createElement('span');
    label.textContent = 'Auto';

    toggle.appendChild(checkbox);
    toggle.appendChild(indicator);
    toggle.appendChild(label);

    // Store reference
    this.autoScrollToggle = toggle;

    // Click handler
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      this.autoScrollEnabled = !this.autoScrollEnabled;
      checkbox.checked = this.autoScrollEnabled;

      // Update styles
      toggle.style.background = this.autoScrollEnabled ? '#e0f2fe' : '#fff';
      toggle.style.borderColor = this.autoScrollEnabled ? '#3b82f6' : '#ddd';
      toggle.style.color = this.autoScrollEnabled ? '#1d4ed8' : '#333';
      indicator.style.background = this.autoScrollEnabled ? '#3b82f6' : '#ccc';
      knob.style.left = this.autoScrollEnabled ? '14px' : '2px';
      toggle.classList.toggle('active', this.autoScrollEnabled);

      // Trigger callback
      if (this.options.onAutoScrollChange) {
        this.options.onAutoScrollChange(this.autoScrollEnabled);
      }
    });

    return toggle;
  }

  /**
   * Get whether auto-scroll is enabled
   * @returns {boolean}
   */
  isAutoScrollEnabled() {
    return this.autoScrollEnabled;
  }

  /**
   * Set auto-scroll enabled state
   * @param {boolean} enabled
   */
  setAutoScrollEnabled(enabled) {
    if (this.autoScrollEnabled !== enabled && this.autoScrollToggle) {
      this.autoScrollToggle.click();
    }
  }

  /**
   * Add custom styles for the range slider thumb
   */
  addSliderStyles() {
    const styleId = 'timeline-slider-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .timeline-slider::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: ${this.options.thumbSize}px;
        height: ${this.options.thumbSize}px;
        background: #3b82f6;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: transform 0.15s ease;
      }
      .timeline-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      .timeline-slider::-moz-range-thumb {
        width: ${this.options.thumbSize}px;
        height: ${this.options.thumbSize}px;
        background: #3b82f6;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .timeline-slider::-moz-range-track {
        height: ${this.options.trackHeight}px;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get the current progress percentage
   * @returns {number} - Progress percentage (0-100)
   */
  getProgressPercent() {
    if (this.totalSteps === 0) return 100;
    return (this.currentStep / this.totalSteps) * 100;
  }

  /**
   * Update the slider track gradient to show progress
   */
  updateSliderStyle() {
    if (!this.sliderElement) return;
    const percent = this.getProgressPercent();
    this.sliderElement.style.background = 
      `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percent}%, #dee2e6 ${percent}%, #dee2e6 100%)`;
  }

  /**
   * Update the step info display
   */
  updateStepInfo() {
    if (!this.infoElement) return;
    if (this.currentStep === 0) {
      this.infoElement.textContent = 'Start';
    } else if (this.currentStep === this.totalSteps) {
      this.infoElement.textContent = `All ${this.totalSteps} steps`;
    } else {
      this.infoElement.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }
  }

  /**
   * Trigger the onChange callback
   */
  triggerChange() {
    if (this.options.onChange) {
      this.options.onChange(this.currentStep, this.totalSteps);
    }
  }

  /**
   * Go to a specific step
   * @param {number} step - The step number to go to
   */
  goToStep(step) {
    this.currentStep = Math.max(0, Math.min(step, this.totalSteps));
    if (this.sliderElement) {
      this.sliderElement.value = String(this.currentStep);
    }
    this.updateSliderStyle();
    this.updateStepInfo();
    this.triggerChange();
  }

  /**
   * Go to the next step
   */
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  }

  /**
   * Go to the previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  /**
   * Get the current step number
   * @returns {number} - Current step (0 = start, 1-n = step number, n = all steps shown)
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * Get the total number of steps
   * @returns {number} - Total steps
   */
  getTotalSteps() {
    return this.totalSteps;
  }

  /**
   * Get the visibility state for a message at a given index
   * @param {number} messageIndex - The 0-based index of the message
   * @returns {string} - One of StepState.PAST, StepState.CURRENT, or StepState.FUTURE
   */
  getMessageState(messageIndex) {
    // messageIndex is 0-based, currentStep is 1-based for messages
    // currentStep 0 = no messages shown (all future)
    // currentStep 1 = first message is current
    // currentStep n = nth message is current
    
    if (this.currentStep === 0) {
      // No messages shown yet - all are future
      return StepState.FUTURE;
    }
    
    const messageStep = messageIndex + 1; // Convert to 1-based
    
    if (messageStep < this.currentStep) {
      return StepState.PAST;
    } else if (messageStep === this.currentStep) {
      return StepState.CURRENT;
    } else {
      return StepState.FUTURE;
    }
  }

  /**
   * Destroy the timeline slider and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.sliderElement = null;
    this.infoElement = null;
  }
}
