const mongoose = require('mongoose');

const suggestionComplaintSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['suggestion', 'complaint'],
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    recipient: {
      type: {
        type: String,
        enum: ['superadmin', 'sangh', 'user'],
        required: true
      },
      sanghLevel: {
        type: String,
        enum: ['national', 'state', 'district', 'city', 'area'],
        required: function() {
          return this.recipient.type === 'sangh';
        }
      },
      sanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HierarchicalSangh',
        required: function() {
          return this.recipient.type === 'sangh';
        }
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
          return this.recipient.type === 'user';
        }
      }
    },
    status: {
      type: String,
      enum: ['pending', 'in-review', 'resolved'],
      default: 'pending'
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    response: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);
// Add to the bottom of your schema definition
suggestionComplaintSchema.index({ status: 1 });
suggestionComplaintSchema.index({ type: 1 });
suggestionComplaintSchema.index({ submittedBy: 1 });
suggestionComplaintSchema.index({ 'recipient.type': 1 });
suggestionComplaintSchema.index({ createdAt: -1 });
// Compound index for common query patterns
suggestionComplaintSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SuggestionComplaint', suggestionComplaintSchema);
