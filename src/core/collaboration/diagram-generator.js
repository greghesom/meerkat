/**
 * Diagram Generator Utility
 * Generates diagram source code from AST modifications
 */

/**
 * Generate a message line from a message object
 * @param {Object} message - The message object
 * @returns {string} The generated line
 */
export function generateMessageLine(message) {
  let line = '';
  
  // Source and target with arrow
  const arrow = getArrowFromType(message.arrow);
  line += `${message.source}${arrow}${message.target}: ${message.text}`;
  
  // Add annotations
  const annotations = message.annotations || {};
  
  // Path annotation
  if (annotations.path) {
    const pathValue = annotations.method 
      ? `${annotations.method} ${annotations.path}`
      : annotations.path;
    line += ` @path(${pathValue})`;
  }
  
  // Type annotation
  if (annotations.requestType) {
    line += ` @type(${annotations.requestType})`;
  }
  
  // Sync/Async annotation
  if (annotations.isAsync) {
    line += ' @async';
  }
  
  // Timeout annotation
  if (annotations.timeout) {
    line += ` @timeout(${annotations.timeout})`;
  }
  
  // Queue annotation
  if (annotations.queue) {
    line += ` @queue(${annotations.queue})`;
  }
  
  // Flow annotation
  if (annotations.flows && annotations.flows.length > 0) {
    line += ` @flow(${annotations.flows.join(', ')})`;
  }
  
  // Request payload annotation
  if (annotations.request) {
    if (annotations.request.type === 'reference') {
      line += ` @request{${annotations.request.url}}`;
    } else if (annotations.request.schema) {
      line += ` @request{${annotations.request.schema}}`;
    }
  }
  
  // Response payload annotation
  if (annotations.response) {
    if (annotations.response.type === 'reference') {
      line += ` @response{${annotations.response.url}}`;
    } else if (annotations.response.schema) {
      line += ` @response{${annotations.response.schema}}`;
    }
  }
  
  return line;
}

/**
 * Get the arrow string from arrow type
 * @param {Object} arrow - The arrow object with line and head properties
 * @returns {string} The arrow string
 */
function getArrowFromType(arrow) {
  if (!arrow) return '->>';
  
  const isDashed = arrow.line === 'dashed';
  const isFilled = arrow.head === 'filled' || arrow.head !== 'open';
  
  if (isDashed && isFilled) return '-->>';
  if (isDashed && !isFilled) return '-->';
  if (!isDashed && isFilled) return '->>';
  return '->';
}

/**
 * Update a diagram source by modifying a specific message
 * @param {string} source - The original diagram source
 * @param {number} messageIndex - The index of the message to update
 * @param {Object} newMessage - The new message object
 * @param {Object} ast - The current AST
 * @returns {string} The updated source
 */
export function updateMessageInSource(source, messageIndex, newMessage, ast) {
  const lines = source.split('\n');
  let currentMessageIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line is a message (contains arrow pattern)
    if (isMessageLine(line)) {
      currentMessageIndex++;
      
      if (currentMessageIndex === messageIndex) {
        // Get the indentation from the original line
        const indent = lines[i].match(/^(\s*)/)[1];
        // Generate the new line
        lines[i] = indent + generateMessageLine(newMessage);
        break;
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Insert a new message into the diagram source
 * @param {string} source - The original diagram source
 * @param {number} insertIndex - The index to insert at (0 = first message position)
 * @param {Object} newMessage - The new message object
 * @param {Object} ast - The current AST
 * @returns {string} The updated source
 */
export function insertMessageInSource(source, insertIndex, newMessage, ast) {
  const lines = source.split('\n');
  let currentMessageIndex = -1;
  let insertLineIndex = -1;
  let indent = '    '; // Default indentation
  
  // Find the line index to insert at
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line is a message
    if (isMessageLine(line)) {
      currentMessageIndex++;
      indent = lines[i].match(/^(\s*)/)[1];
      
      if (currentMessageIndex === insertIndex) {
        insertLineIndex = i;
        break;
      }
    }
  }
  
  // If we didn't find the exact position, insert after the last message
  if (insertLineIndex === -1) {
    // Find the last message line
    for (let i = lines.length - 1; i >= 0; i--) {
      if (isMessageLine(lines[i].trim())) {
        insertLineIndex = i + 1;
        indent = lines[i].match(/^(\s*)/)[1];
        break;
      }
    }
  }
  
  // If still no position found (no messages yet), find after participant declarations
  if (insertLineIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('participant') || lines[i].trim().startsWith('actor')) {
        insertLineIndex = i + 1;
        indent = lines[i].match(/^(\s*)/)[1];
      }
    }
    // If no participants, insert after sequenceDiagram
    if (insertLineIndex === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === 'sequenceDiagram') {
          insertLineIndex = i + 1;
          break;
        }
      }
    }
  }
  
  // Default to end if nothing found
  if (insertLineIndex === -1) {
    insertLineIndex = lines.length;
  }
  
  // Generate the new line
  const newLine = indent + generateMessageLine(newMessage);
  
  // Insert the new line
  lines.splice(insertLineIndex, 0, newLine);
  
  return lines.join('\n');
}

/**
 * Delete a message from the diagram source
 * @param {string} source - The original diagram source
 * @param {number} messageIndex - The index of the message to delete
 * @returns {string} The updated source
 */
export function deleteMessageFromSource(source, messageIndex) {
  const lines = source.split('\n');
  let currentMessageIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (isMessageLine(line)) {
      currentMessageIndex++;
      
      if (currentMessageIndex === messageIndex) {
        lines.splice(i, 1);
        break;
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Check if a line is a message line (contains an arrow pattern)
 * @param {string} line - The line to check
 * @returns {boolean}
 */
function isMessageLine(line) {
  // Skip comments and directives
  if (line.startsWith('%%') || line.startsWith('//') || line === '') {
    return false;
  }
  
  // Skip keywords
  const keywords = ['sequenceDiagram', 'participant', 'actor', 'Note', 'title', 'description'];
  for (const keyword of keywords) {
    if (line.startsWith(keyword)) {
      return false;
    }
  }
  
  // Check for arrow patterns
  const arrowPatterns = ['->>', '-->>',  '->', '-->'];
  return arrowPatterns.some(arrow => line.includes(arrow));
}

/**
 * Export diagram data as JSON
 * @param {Object} diagramData - The diagram data object
 * @param {string} modifiedSource - The modified diagram source
 * @param {Object} comments - Comments object (stepIndex -> comments array)
 * @returns {string} JSON string
 */
export function exportDiagramAsJson(diagramData, modifiedSource, comments = {}) {
  const exportData = {
    name: diagramData.name || 'Exported Diagram',
    description: diagramData.description || '',
    diagram: modifiedSource,
    comments: comments,
    exportedAt: new Date().toISOString(),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Download a file to the user's computer
 * @param {string} content - The file content
 * @param {string} filename - The filename
 * @param {string} mimeType - The MIME type
 */
export function downloadFile(content, filename, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}
