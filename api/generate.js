import fetch from 'node-fetch';
import FormData from 'form-data';
import { Buffer } from 'node:buffer';

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageUrl } = req.body;

  const prompt = `Slightly enlarge the head for a cartoonish look, while preserving facial structure.

Add crossed, unfocused cartoon eyes with visible white space, keeping original eye size and orientation.

Overlay an open mouth with a silly expression and blue drool, without changing the actual mouth shape.

Keep hair, ears, eyebrows structure intact—just redraw in a hand-drawn cartoon style.

if dont have ears, dont add ears.

Preserve skin tone exactly from the image.

Add a sketchy “LOWIQ” badge to the subject’s clothing.

Use flat pastel or garish colors, no shading, wobbly cartoon lines.

Do not change clothing, body, background, or pose.`;

  if (!imageUrl) {
    return res.status(400).json({ error: "Missing imageUrl" });
  }

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch image from Supabase");

    const imageBuffer = await imageResponse.buffer();

    const formData = new FormData();
    formData.append("image", imageBuffer, {
      filename: "image.png",
      contentType: "image/png",
    });
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", "1024x1024");
    formData.append("quality", "high");
    formData.append("output_format", "png");
    formData.append("response_format", "b64_json");
    formData.append("model", "gpt-image-1");

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const result = await openaiRes.json();

    if (!openaiRes.ok) {
      return res.status(500).json({ error: result.error?.message || "OpenAI failed" });
    }

    return res.status(200).json({ resultUrl: result.data[0].b64_json });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
