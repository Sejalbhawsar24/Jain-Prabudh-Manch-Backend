const JainItihas = require("../model/JainItihas");

// Create a new Jain Itihas entry
exports.createJainItihas = async (req, res) => {
  try {
    console.log("Uploaded File:", req.file);
    const { title, caption, userId } = req.body;
    const image = req.file ? req.file.filename : null; 
    const newEntry = new JainItihas({ title, caption, image, userId });
    await newEntry.save();
    res.status(201).json({ 
      message: "Entry created successfully", 
      data: {
        ...newEntry._doc, 
        imageUrl: `http://10.0.2.2:4000/uploads/${image}`
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all Jain Itihas entries
exports.getAllJainItihas = async (req, res) => {
  try {
    const entries = await JainItihas.find().populate("userId", "fullName profilePicture");
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//  Update Jain Itihas entry
exports.updateJainItihas = async (req, res) => {
  try {
    const { title, caption } = req.body;
    const image = req.file ? req.file.filename : null;
    const updatedData = { title, caption };
    if (image) updatedData.image = image;
    const updatedEntry = await JainItihas.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!updatedEntry) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.status(200).json({ message: "Entry updated successfully", data: updatedEntry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Jain Itihas entry
exports.deleteJainItihas = async (req, res) => {
  try {
    const deletedEntry = await JainItihas.findByIdAndDelete(req.params.id);

    if (!deletedEntry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.status(200).json({ message: "Entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
//  Like/Unlike Jain Itihas Post
exports.likeJainItihas = async (req, res) => {
  try {
    const { postId, userId } = req.body;
    if (!postId || !userId) {
      return res.status(400).json({ message: "Post ID and User ID are required!" });
    }
    const post = await JainItihas.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found!" });
    }
    const alreadyLiked = post.likePost.includes(userId);
    if (alreadyLiked) {
      // Unlike karega
      post.likePost = post.likePost.filter((id) => id.toString() !== userId);
    } else {
      // Like karega
      post.likePost.push(userId);
    }
    await post.save();
    res.status(200).json({
      message: alreadyLiked ? "Post unliked successfully" : "Post liked successfully",
      likeCount: post.likePost.length,
      likePost: post.likePost,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
