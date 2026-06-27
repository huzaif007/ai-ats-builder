const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  linkedinData: {
    type: mongoose.Schema.Types.Mixed, // Accepts the massive flexible JSON object
    required: true,
  },
  atsScore: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);