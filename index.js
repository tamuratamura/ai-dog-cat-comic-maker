
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

    // First, analyze the image using GPT-4V
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-vision-preview-0",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この画像で4コマ漫画を描いてください。内容はコミカルな感じで キャラクターはかわいい感じでお願いします。 画像内の文字は英語で表記お願いします。"
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
      max_tokens: 500
    });

    const imageDescription = analysis.choices[0].message.content;

    // Generate comic with DALL-E 3 using the analysis
    const prompt = `Create a 4-panel manga/comic strip layout (2x2 grid) based on this story: ${imageDescription}
                    Requirements:
                    - Layout: Exactly 4 panels in 2x2 grid with clear borders
                    - Flow: 1(top-left) → 2(top-right) → 3(bottom-left) → 4(bottom-right)
                    - Style: Kawaii/cute manga style, similar to the reference
                    - Text: English dialogue in speech bubbles
                    - Story: Must be comical and entertaining
                    - Character: Must maintain consistent cute character design across all panels
                    Make sure it's family-friendly and charming, with clear panel transitions.`;

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
