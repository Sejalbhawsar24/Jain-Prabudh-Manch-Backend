const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client } = require('../config/s3Config');
const path = require('path');
const sharp = require('sharp');

// File type validation
const allowedTypes = new Set([
  'image/jpeg', 
  'image/jpg', 
  'image/png', 
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo'
]);


const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'groupIcon') {
    // Stricter validation for group icons
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed for group icons'));
    }
    return;
  }
  // Other file types...
  if (allowedTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

// Determine folder based on file field name
const getS3Folder = (fieldname, req) => {
  switch(fieldname) {
    case 'profilePicture':
      return 'profile-pictures/';
    case 'panCard':
      return 'documents/pan-cards/';
    case 'aadharCard':
      return 'documents/aadhar-cards/';
    case 'userProfile':
      return 'documents/user-profiles/';
    case 'chatImage':
      return 'chat-media/images/';
    case 'groupImage':
      return 'groups/images/';
    case 'image': // For posts
      return 'posts/images/';
    case 'video': // For posts
      return 'posts/videos/';
    case 'media': // For stories
      if (req && req.baseUrl) {
        if (req.baseUrl.includes('sangh-posts')) {
          return 'sanghs/posts/media/';
        } else if (req.baseUrl.includes('panch-posts')) {
          return 'panch/posts/media/';
        } else if (req.baseUrl.includes('tirth-posts')) {
          return 'tirth/posts/media/';
        } else if (req.baseUrl.includes('vyapar/posts')) {
          return 'vyapar/posts/media/';
        }
      }
      return 'stories/';
        // Add Sangathan document folders
    case 'presidentJainAadhar':
      return 'sangathan/documents/president/';
    case 'secretaryJainAadhar':
      return 'sangathan/documents/secretary/';
    case 'treasurerJainAadhar':
      return 'sangathan/documents/treasurer/';
    case 'presidentPhoto':
      return 'sangathan/photos/president/';
    case 'secretaryPhoto':
      return 'sangathan/photos/secretary/';
    case 'treasurerPhoto':
      return 'sangathan/photos/treasurer/';
    case 'jainAadharPhoto':
      return 'sangathan/panch/documents/';
    case 'profilePhoto':
      return 'sangathan/panch/photos/';
    case 'biodataImage':
      return 'biodata/images/'
    case 'jobPost':
      return 'jobs/posts/';
    case 'candidateResume':
      return 'resumeUploads/';
    case 'jainItihas':
      return 'jainItihas/image/';
    case 'jainGranth':
      return 'jainGranth/';
    case 'govtYojana':
      return 'govtYojana/image/';
    case 'tirthPhoto':
      return 'tirth/photos/';
    case 'tirthDocument':
      return 'tirth/documents/';
    // Add JainVyapar folders
    case 'businessPhotos':
      return 'vyapar/photos/';
    case 'businessDocuments':
      return 'vyapar/documents/';
    case 'uploadImage':
      return 'sadhu/profile-images/';
    case 'documents':
      return 'sadhu/documents/';
    case 'media':
      return 'sadhu/post-media/';
    case 'entityPhoto':
      if (req && req.baseUrl) {
        if (req.baseUrl.includes('sadhu')) {
          return 'sadhu/photos/';
        } else if (req.baseUrl.includes('tirth')) {
          return 'tirth/photos/';
        } else if (req.baseUrl.includes('vyapar')) {
          return 'vyapar/photos/';
        }
      }
      return 'others/';
    case 'entityDocuments':
      if (req && req.baseUrl) {
        if (req.baseUrl.includes('sadhu')) {
          return 'sadhu/documents/';
        } else if (req.baseUrl.includes('tirth')) {
          return 'tirth/documents/';
        } else if (req.baseUrl.includes('vyapar')) {
          return 'vyapar/documents/';
        }
      }
      return 'others/';
    default:
      return 'others/';
  }
};

// Configure multer with S3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      // Get folder based on file field name
      const folder = getS3Folder(file.fieldname, req);
      // Create unique filename with timestamp and random string
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = uniqueSuffix + path.extname(file.originalname);
      // Full S3 key with folder path
      const fullPath = folder + filename;
      cb(null, fullPath);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: fileFilter
});

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next();
};
// Add this to the multer configuration
const optimizeImage = async (req, res, next) => {
  if (!req.file || !['profilePicture', 'chatImage','groupImage', 'groupIcon', 'image', 'media'].includes(req.file.fieldname)) return next();

  try {
    const optimized = await sharp(req.file.buffer)
      .resize(800, 800, { // Standard size for images
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 }) // Compress and convert to JPEG
      .toBuffer();

    req.file.buffer = optimized;
    next();
  } catch (error) {
    next(error);
  }
};

// Export specific upload configurations
module.exports = upload;
module.exports.handleMulterError = handleMulterError;
module.exports.chatImageUpload = [upload.single('chatImage'), optimizeImage];
module.exports.jainAadharDocs = upload.fields([
  { name: 'panCard', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 },
  { name: 'userProfile', maxCount: 1 }
]);
module.exports.storyUpload = [upload.array('media', 10), optimizeImage];
module.exports.postMediaUpload = [upload.fields([
  { name: 'image', maxCount: 10 },
  { name: 'video', maxCount: 10 }
]), optimizeImage];
module.exports.jobPostUpload = upload.fields([
  { name: 'jobPost', maxCount: 10 },
]);
module.exports.candidateResumeUpload = upload.fields([
  { name: 'candidateResume', maxCount: 1 }
]);
module.exports.jaintihasUpload = upload.single('image');
module.exports.jainGranthUpload = upload.single('jainGranth');
module.exports.govtYojanaUpload = upload.single('image');
module.exports.optimizeGroupIcon = optimizeImage;
// Add Sangathan document upload configuration
module.exports.sangathanDocs = upload.fields([
  { name: 'presidentJainAadhar', maxCount: 1 },
  { name: 'secretaryJainAadhar', maxCount: 1 },
  { name: 'treasurerJainAadhar', maxCount: 1 },
  { name: 'presidentPhoto', maxCount: 1 },
  { name: 'secretaryPhoto', maxCount: 1 },
  { name: 'treasurerPhoto', maxCount: 1 }
]);
// Add specific Panch document upload configuration for all 5 members
module.exports.panchGroupDocs = upload.fields([
  { name: 'members[0].jainAadharPhoto', maxCount: 1 },
  { name: 'members[0].profilePhoto', maxCount: 1 },
  { name: 'members[1].jainAadharPhoto', maxCount: 1 },
  { name: 'members[1].profilePhoto', maxCount: 1 },
  { name: 'members[2].jainAadharPhoto', maxCount: 1 },
  { name: 'members[2].profilePhoto', maxCount: 1 },
  { name: 'members[3].jainAadharPhoto', maxCount: 1 },
  { name: 'members[3].profilePhoto', maxCount: 1 },
  { name: 'members[4].jainAadharPhoto', maxCount: 1 },
  { name: 'members[4].profilePhoto', maxCount: 1 }
]);
module.exports.biodataImageUpload = upload.fields([
  { name: 'passportPhoto', maxCount: 1 },
  { name: 'fullPhoto', maxCount: 1 },
  { name: 'familyPhoto', maxCount: 1 },
  { name: 'legalDocument', maxCount: 1 }
]);
module.exports.sadhuDocs = upload.fields([
  { name: 'entityPhoto', maxCount: 5 },
  { name: 'entityDocuments', maxCount: 5 },
  { name: 'uploadImage', maxCount: 1 } 
]);

// Add Tirth document upload configuration
module.exports.tirthDocs = upload.fields([
  { name: 'entityPhoto', maxCount: 5 },
  { name: 'entityDocuments', maxCount: 5 }
]);

// Add JainVyapar document upload configuration
module.exports.vyaparDocs = upload.fields([
  { name: 'entityPhoto', maxCount: 5 },
  { name: 'entityDocuments', maxCount: 5 }
]);

// Add entity post upload configuration (standardized for all entities)
module.exports.entityPostUpload = upload.array('media', 10);