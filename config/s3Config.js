const { S3Client, DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BUCKET_NAME'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create S3 client with retry configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
  retryMode: 'standard',
  logger: console
});

// Test S3 connection - but don't block module loading
const testS3Connection = async () => {
  try {
    await s3Client.config.credentials();
    console.log('✅ Successfully connected to AWS S3');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to AWS S3:', {
      message: error.message,
      code: error.code,
      time: new Date().toISOString()
    });
    return false;
  }
};

// Export a function to check connection status
const getS3Status = async () => {
  const isConnected = await testS3Connection();
  return {
    isConnected,
    bucket: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION
  };
};

module.exports = { 
  s3Client, 
  DeleteObjectCommand, 
  PutObjectCommand,
  getS3Status 
};
