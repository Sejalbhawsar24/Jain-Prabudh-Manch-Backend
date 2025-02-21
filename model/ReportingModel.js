const mongoose = require('mongoose');

const eventSectionSchema = new mongoose.Schema({
  events: { type: String, required: true },
  members: { type: String, required: true },
  eventDate: { type: Date, required: true }
});

const reportingSchema = new mongoose.Schema(
  {
    ikaiName: { type: String, required: true },
    presidentName: { type: String, required: true },
    secretaryName: { type: String, required: true },
    treasurerName: { type: String, required: true },
    membership: { type: String, required: true },
    reportMonth: { type: Number, required: true },
    reportYear: { type: Number, required: true },
    meetingsHeld: { type: String, required: true },
    meetingsAttended: { type: String, required: true },
    projects: { type: String, required: true },
    events: { type: String, required: true },
    members: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventSections: [eventSectionSchema],
    selectedOption: { type: String, required: true },
    fieldBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reporting', reportingSchema);
