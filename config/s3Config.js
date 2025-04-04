const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BUCKET_NAME'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Create S3 client with retry configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3, // Retry configuration
  retryMode: 'standard'
});

// Test S3 connection
const testS3Connection = async () => {
  try {
    await s3Client.config.credentials();
    console.log('Successfully connected to AWS S3');
  } catch (error) {
    console.error('Failed to connect to AWS S3:', error);
    throw error;
  }
};

testS3Connection();

module.exports = { s3Client, DeleteObjectCommand };