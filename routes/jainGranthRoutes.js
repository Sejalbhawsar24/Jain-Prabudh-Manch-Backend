const express = require("express");
const upload = require("../middlewares/upload");
const { uploadGranth, getAllGranths } = require("../controller/jainGranthController");

const router = express.Router();

router.post("/upload", upload.single("file"), uploadGranth); // Upload Granth
router.get("/all", getAllGranths); // Get All Granths

module.exports = router;
