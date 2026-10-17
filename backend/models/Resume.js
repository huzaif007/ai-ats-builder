const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  linkedinData: {
    type: mongoose.Schema.Types.Mixed,
    default: null, // No longer required so PDFs don't crash
  },
  parsedText: {
    type: String,
    default: '',   // Will store the extracted PDF text
  },
  atsScore: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);