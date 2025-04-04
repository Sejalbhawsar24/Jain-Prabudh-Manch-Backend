const mongoose = require('mongoose');

const RojgarRecruiteeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobType: {
      type: String,
      default: 'recruitee',
    },
    candidateName: {
      type: String,
    },
    mobile: {
      type: String,
    },
    email: {
      type: String,
    },
    address: {
      type: String,
    },
    gender: {
      type: String,
    },
    candidateResume:{
      type: String,
    },
  },
  { timestamps: true }
);

const RojgarRecruitee = mongoose.model('RojgarRecruitee', RojgarRecruiteeSchema);

module.exports = RojgarRecruitee;
