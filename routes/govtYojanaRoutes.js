const express = require("express");
const upload = require("../middlewares/upload");
const router = express.Router();
const govtYojanaController = require('../controller/govtYojanaController')

//  API Routes
router.post("/create", upload.single("image"), govtYojanaController.createYojana);
router.get("/all", govtYojanaController.getAllYojanas);
router.delete("/delete/:id", govtYojanaController.deleteYojana);

module.exports = router;
