const config = {
    development: {
      mongoUrl: process.env.MONGODB_URL,
      awsRegion: process.env.AWS_REGION,
      awsBucket: process.env.AWS_BUCKET_NAME,
      jwtSecret: process.env.JWT_SECRET
    },
    production: {
      mongoUrl: process.env.MONGODB_URL,
      awsRegion: process.env.AWS_REGION,
      awsBucket: process.env.AWS_BUCKET_NAME,
      jwtSecret: process.env.JWT_SECRET
    },
    test: {
      mongoUrl: process.env.TEST_MONGODB_URL,
      awsRegion: process.env.AWS_REGION,
      awsBucket: process.env.AWS_BUCKET_NAME,
      jwtSecret: process.env.JWT_SECRET
    }
  };
  
  const environment = process.env.NODE_ENV || 'development';
  module.exports = config[environment]; 