const mongoose = require('mongoose');

const suggestionComplaintSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
    },
    description: {
      type: String,
    },
    sendTo: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SuggestionComplaint', suggestionComplaintSchema);
