import OpenAI from "openai";
import fileType from "file-type";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

    // ここで MIME タイプを file-type モジュールで検出
    const type = await fileType.fromBuffer(buffer);
    if (!type || !type.mime.startsWith("image/")) {
      return res
        .status(400)
        .json({ error: "Invalid MIME type. Only image types are supported." });
    }

    const base64Image = buffer.toString("base64");

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert visual analyzer.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and describe the character's visual traits (fur/hair color, size, eyes, expression, notable features) in 2-3 short sentences. Focus on the most distinctive features that would make this character unique in a comic.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${type.mime};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    const characterTraits = visionResponse.choices[0].message.content;

    const prompt = `A cute and funny 4-panel comic featuring a ${characterTraits}. The comic is in a kawaii art style with pastel colors and soft backgrounds.`;

    const dalleResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      style: "natural",
    });

    res.status(200).json({
      success: true,
      imageUrl: dalleResponse.data[0].url,
    });
  } catch (error) {
    console.error("Error generating comic:", error);
    const message = error.response?.data?.error?.message || error.message;
    res.status(500).json({ error: message });
  }
}
