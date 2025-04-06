
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
    const prompt = `Create a 4-panel manga/comic strip (yonkoma manga) in a 2x2 grid layout, using this specific dog image as reference: ${imageUrl}

                    Critical requirements:
                    - Layout: Must be exactly 4 panels in a 2x2 grid with clear black borders
                    - Character: The main character must closely match the physical features of the dog in the reference image
                    - Panels: Each panel should show a clear progression of a simple, humorous story
                    - Style: Cute manga style with clean lines and simple backgrounds
                    - Text: Short English dialogue in speech bubbles
                    - Flow: Read from top-left → top-right → bottom-left → bottom-right
                    
                    Additional specifications:
                    - Keep the dog's distinctive features consistent across all panels
                    - Use simple backgrounds that don't distract from the main character
                    - Make the story light-hearted and family-friendly
                    - Include clear panel borders and maintain consistent art style`;

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
