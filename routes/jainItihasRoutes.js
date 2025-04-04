const express = require("express");
const router = express.Router();
const { createJainItihas, getAllJainItihas, updateJainItihas, deleteJainItihas, likeJainItihas } = require("../controller/jainItihasController");
const upload = require("../middlewares/upload");


router.post("/create", upload.jaintihasUpload, createJainItihas);
router.get("/getAll", getAllJainItihas);
router.put("/update/:id", upload.single("image"), updateJainItihas);
router.delete("/delete/:id", deleteJainItihas);
router.post("/like", likeJainItihas); 
module.exports = router;
