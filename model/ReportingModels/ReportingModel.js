const mongoose = require('mongoose');

// Define a schema for visit details - Simplified
const visitSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  visitorName: {
    type: String,
    required: true
  },
  visitorLevel: {
    type: String,
    enum: ['national', 'state', 'district', 'city', 'area'],
    required: true
  },
  purpose: {
    type: String,
    required: true
  }
}, { _id: true });

// Define a schema for meeting details
const meetingSchema = new mongoose.Schema({
  meetingNumber: {
    type: Number,
    required: true,
    min: 1
  },
  date: {
    type: Date,
    required: true
  },
  attendanceCount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

// Define a schema for project/event details
const projectSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true
  },
  memberCount: {
    type: Number,
    required: true,
    min: 0
  },
  eventDate: {
    type: Date,
    required: true
  }
}, { _id: true });

const reportingSchema = new mongoose.Schema(
  {
    // Sangh Information
    submittingSanghId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HierarchicalSangh',
      required: true
    },
    recipientSanghId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HierarchicalSangh',
      required: true
    },
    // Basic Information
    sanghName: { 
      type: String, 
      required: true 
    },
    presidentName: { 
      type: String, 
      required: true 
    },
    secretaryName: { 
      type: String, 
      required: true 
    },
    treasurerName: { 
      type: String, 
      required: true 
    },
    // Reporting Period
    reportMonth: { 
      type: Number, 
      required: true,
      min: 1,
      max: 12
    },
    reportYear: { 
      type: Number, 
      required: true 
    },
    // Meeting Information
    generalMeetings: {
      count: {
        type: Number,
        required: true,
        default: 0
      },
      details: [meetingSchema]
    },
    boardMeetings: {
      count: {
        type: Number,
        required: true,
        default: 0
      },
      details: [meetingSchema]
    },
    // Visits Information (Super Simplified)
    visits: [visitSchema],
    // Membership Information
    membershipCount: { 
      type: Number, 
      required: true,
      min: 0
    },
    jainAadharCount: {
      type: Number,
      required: true,
      default: 0
    },
    // Projects/Events Information
    projects: [projectSchema],
    // Status
    status: {
      type: String,
      enum: ['submitted', 'reviewed', 'approved'],
      default: 'submitted'
    },
    feedback: {
      type: String,
      default: ''
    },
    // Submission Information
    submittedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Add to the bottom of your schema definition
reportingSchema.index({ submittingSanghId: 1 });
reportingSchema.index({ recipientSanghId: 1 });
reportingSchema.index({ status: 1 });
reportingSchema.index({ reportMonth: 1, reportYear: 1 });
reportingSchema.index({ submittedById: 1 });
// Compound indexes
reportingSchema.index({ recipientSanghId: 1, status: 1 });
reportingSchema.index({ reportMonth: 1, reportYear: 1, status: 1 });

module.exports = mongoose.model('Reporting', reportingSchema);