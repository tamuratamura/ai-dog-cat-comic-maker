
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

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');

    // First, analyze the image to extract character traits
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4-1106-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert visual analyzer."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and describe the character's visual traits (fur/hair color, size, eyes, expression, notable features) in 2-3 short sentences. Focus on the most distinctive features that would make this character unique in a comic."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${req.file.mimetype};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 150
    });

    const characterTraits = visionResponse.choices[0].message.content;

    // Then, generate a story using the character traits
    const storyResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a creative comic writer."
        },
        {
          role: "user",
          content: `Create a cute and funny 4-panel comic strip featuring a character with these traits: ${characterTraits}\nRespond in this format:\n1. [panel 1 text]\n2. [panel 2 text]\n3. [panel 3 text]\n4. [panel 4 text]`
        }
      ]
    });

    const story = storyResponse.choices[0].message.content;

    // Then use the story to generate the comic with DALL-E
    const prompt = `Create a 4-panel manga (2x2 grid layout) featuring a character with these traits: ${characterTraits}
                    Scenes:
                    ${story}
                    Style: Cute manga style with clean black borders between panels.
                    Include speech bubbles with the text.
                    Layout: 2x2 grid, read from top-left to right, then bottom-left to right.
                    Make sure the character's distinctive features are consistent across all panels.`;

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
