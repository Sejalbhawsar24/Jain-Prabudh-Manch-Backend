const mongoose = require("mongoose");

const govtYojanaSchema = new mongoose.Schema({
  userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
  yojanaName: { type: String, required: true },
  image: { type: String, required: true },
}, { timestamps: true });

const GovtYojana = mongoose.model("GovtYojana", govtYojanaSchema);
module.exports = GovtYojana;
