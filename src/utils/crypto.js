// URL-safe payload encoder and decoder for Secret Santa reveal links

/**
 * Encodes an object payload into a safe URL token
 * @param {Object} data 
 * @returns {string}
 */
export function encodeSecretPayload(data) {
  try {
    const jsonStr = JSON.stringify(data);
    // Simple UTF-8 safe base64 encoding
    const encoded = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    // Make URL-safe (+ to -, / to _, remove =)
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode payload:', err);
    return '';
  }
}

/**
 * Decodes a token from the URL back into the object payload
 * @param {string} token 
 * @returns {Object|null}
 */
export function decodeSecretPayload(token) {
  try {
    if (!token) return null;
    // Restore base64 padding and characters
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decodedStr = decodeURIComponent(
      Array.prototype.map.call(atob(base64), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(decodedStr);
  } catch (err) {
    console.error('Failed to decode payload:', err);
    return null;
  }
}
