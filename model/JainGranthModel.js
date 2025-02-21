const mongoose = require("mongoose");

const JainGranthSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    fileUrl: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JainGranth", JainGranthSchema);
