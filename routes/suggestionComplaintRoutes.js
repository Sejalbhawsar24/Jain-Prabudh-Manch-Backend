const express = require('express');
const router = express.Router();
const suggestionComplaintController = require('../controller/suggestionComplaintController')
router.post('/', suggestionComplaintController.createSuggestionComplaint);
router.get('/', suggestionComplaintController.getAllSuggestionsComplaints);
router.get('/:id', suggestionComplaintController.getSuggestionComplaintById);
router.delete('/:id', suggestionComplaintController.deleteSuggestionComplaint);

module.exports = router;
