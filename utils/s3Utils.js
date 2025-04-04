
/**
 * Utility functions for working with AWS S3
 */

/**
 * Extract the S3 key from a full S3 URL
 * @param {string} url - The full S3 URL
 * @returns {string|null} - The extracted S3 key or null if not a valid S3 URL
 */
const extractS3KeyFromUrl = (url) => {
    if (!url) return null;
    
    try {
      // Parse the URL to extract the path
      const urlObj = new URL(url);
      
      // Remove the leading slash if present
      let key = urlObj.pathname;
      if (key.startsWith('/')) {
        key = key.substring(1);
      }
      
      return key;
    } catch (error) {
      console.error('Error extracting S3 key from URL:', error);
      return null;
    }
  };
  
  module.exports = {
    extractS3KeyFromUrl
  };
  