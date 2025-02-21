const mongoose = require("mongoose");

const JainItihasSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
    },
    caption: {
      type: String,
    },
    image: {
      type: String,
    },
    imageUrl: {
      type:String
    },
    likePost: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("JainItihas", JainItihasSchema);
