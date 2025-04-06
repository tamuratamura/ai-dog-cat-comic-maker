
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Routes
app.post('/api/generate-comic', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // Generate comic directly with DALL-E 3
    const prompt = `Create a 4-panel manga (2x2 grid) based on this dog: ${imageUrl}
                    4 panels with borders (2x2), match dog's features exactly.
                    Read: top-left to right, then bottom-left to right.
                    Include speech bubbles, keep it cute and funny.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural",
    });

    res.json({
      success: true,
      imageUrl: response.data[0].url
    });
  } catch (error) {
    console.error('Error generating comic:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to generate comic';
    res.status(500).json({ 
      error: errorMessage,
      details: error.response?.data || error.message
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
