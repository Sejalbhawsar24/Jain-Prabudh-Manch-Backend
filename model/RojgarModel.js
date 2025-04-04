const mongoose = require("mongoose");

const rojgarSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobType: {
      type: String,
    },
    jainAadhar: {
      type: String,
    },
    jobName: {
      type: String,
    },
    jobDescription: {
      type: String,
    },
    experience: {
      type: String,
    },
    salary: {
      type: String,
    },
    age: {
      type: String,
    },
    gender: {
      type: String,
    },
    language: {
      type: String,
    },
    location: {
      type: String,
    },
    jobContact: {
      type: String,
    },
    jobEmail: {
      type: String,
      required: true,
    },
    jobPost: [
      {
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["image", "video"],
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rojgar", rojgarSchema);
