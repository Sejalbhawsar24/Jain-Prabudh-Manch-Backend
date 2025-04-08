const extractS3KeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    let key = urlObj.pathname;
    return key.startsWith('/') ? key.substring(1) : key;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
};

const convertS3UrlToCDN = (s3Url) => {
  if (!s3Url) return s3Url;
  
  // If already a CloudFront URL, return as-is
  if (s3Url.includes(process.env.CLOUDFRONT_DOMAIN)) {
    return s3Url;
  }
  
  // If using S3 URL, convert to CloudFront
  if (s3Url.includes('.amazonaws.com')) {
    const key = extractS3KeyFromUrl(s3Url);
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }
  
  // If using DigitalOcean Spaces URL (from your commented code)
  if (process.env.DO_ENDPOINT && s3Url.includes(process.env.DO_ENDPOINT)) {
    const key = extractS3KeyFromUrl(s3Url);
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }
  
  // Return original URL if no conversion possible
  return s3Url;
};

module.exports = {
  extractS3KeyFromUrl,
  convertS3UrlToCDN
};
