import mongoose from 'mongoose';

// Define schema for storing requirements in MongoDB
const requirementSchema = new mongoose.Schema({
  file: String,        // Filename of the uploaded file
  text: String,        // Text input provided by the user
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a model using the schema
const Requirement = mongoose.model('Requirement', requirementSchema);

export default Requirement;
