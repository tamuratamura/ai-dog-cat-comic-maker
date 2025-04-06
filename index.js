
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

    // Generate comic with DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: "Create a 4-panel comic strip that's comical and cute based on this image. Add English text captions that tell a funny story.",
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    res.json({
      success: true,
      imageUrl: response.data[0].url
    });
  } catch (error) {
    console.error('Error generating comic:', error);
    res.status(500).json({ error: 'Failed to generate comic' });
  }
});

// Usage tracking endpoint
app.post('/api/track-usage', async (req, res) => {
  const { userId, subscriptionType } = req.body;
  
  // Here you would implement usage tracking logic
  // For now, just return mock response
  res.json({
    dailyUsage: 1,
    remainingToday: subscriptionType === 'free' ? 1 : 
                    subscriptionType === 'standard' ? 9 : 49
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
