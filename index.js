
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

    // First, analyze the image using Vision API
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please describe the main characteristics and features of this image in detail. Focus on the subject's appearance, expressions, and actions."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${req.file.mimetype};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const imageDescription = analysis.choices[0].message.content;

    // Generate comic with DALL-E using the analysis
    const prompt = `Create a 4-panel comic strip (2x2 grid) based on this description: ${imageDescription}. 
                    Make it comical and cute. Each panel should flow naturally to tell a funny story. 
                    Add English text captions that tell a humorous story. 
                    The character should maintain the key features from the original image.
                    Important: Must be exactly 4 panels in a 2x2 grid layout.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
