import express from 'express';
import multer from 'multer';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';  // Google API client
import process from 'process'; // Ensure process is imported
import Requirement from './model/Requirement.js';

dotenv.config();  // Load environment variables from .env file

const app = express();
const upload = multer({ dest: 'uploads/' });  // Setup file uploads

app.use(cors());
app.use(express.json());

// Google Sheets setup
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',  // Path to your service account JSON file
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Function to append data to Google Sheets
async function appendToGoogleSheet(userInput, generatedCode) {
  const authClient = await auth.getClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;  // Google Sheet ID from .env (pre-configured)
  const range = 'Sheet1!A:C';  // Adjust the range as per your sheet structure

  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    resource: {
      values: [
        [userInput, generatedCode, new Date().toISOString()],  // Add user input, AI-generated code, and timestamp
      ],
    },
  });
}

// Rate limiter setup: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  headers: true,
});

// Apply rate limiter to API routes
app.use('/api/', limiter);

// Logging setup
if (process.env.NODE_ENV === 'development') {
  // Log to the console in development mode
  app.use(morgan('dev'));
} else {
  // Log to a file in production mode
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: accessLogStream }));
}

const PORT = 5001;  // Explicitly set to 5001

mongoose.connect('mongodb://localhost:27017/genai-platform')
  .then(() => {
    console.log('AI API Key:', process.env.AI_API_KEY);
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

// Sanitize input to prevent malicious inputs
const sanitizeInput = (input) => input.replace(/<[^>]*>?/gm, '');

// API route to handle file and text submissions
app.post('/api/submit-requirement', upload.single('file'), async (req, res) => {
  try {
    // Validate and handle the uploaded file
    const file = req.file ? req.file.filename : null;
    if (!req.body.text) {
      return res.status(400).json({ error: 'Text field is required.' });
    }

    // Sanitize the input text
    const text = req.body.text;
    const sanitizedText = sanitizeInput(text);

    // Save the sanitized requirement data to MongoDB
    const newRequirement = new Requirement({ file, text: sanitizedText });
    await newRequirement.save();
    console.log('Requirement saved:', newRequirement);

    // Send the sanitized text to the Generative AI API
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`, // Secure API Key from .env
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Use the correct model
        messages: [
          { role: 'system', content: 'You are an assistant that generates code based on user requirements.' },
          { role: 'user', content: sanitizedText }
        ],
        max_tokens: 100, // Specify the max tokens for the response
      }),
    });


    if (!aiResponse.ok) {
      const errorDetails = await aiResponse.text();
      console.log('AI API Key:', process.env.AI_API_KEY);
      console.error('AI API Error:', errorDetails);
      throw new Error('Failed to get a response from AI API');
    }

    const aiResult = await aiResponse.json();
    console.log('Full AI Response:', JSON.stringify(aiResult, null, 2));

    const generatedCode = aiResult.choices?.[0]?.message?.content?.trim();
    if (!generatedCode) {
      console.error('Unexpected AI Response Structure:', aiResult);
      throw new Error('AI did not return a valid response');
    }

    console.log('Generated code from AI:', generatedCode);

    // Append the AI result to Google Sheets
    await appendToGoogleSheet(sanitizedText, generatedCode);

    // Respond to the frontend
    res.status(200).json({
      message: 'Requirement processed and sent to Google Sheets',
      generatedCode,
    });
  } catch (error) {
    console.error('Error processing the requirement:', error.message);
    res.status(500).json({
      error: 'Error processing the requirement',
      details: error.message,
    });
  }
});
