import fetch from "node-fetch";
import FormData from "form-data";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageUrl } = req.body;

  const prompt = `
Transform only the face and head of the person in the image into a lighthearted cartoon parody, keeping facial features (eyes, nose, mouth, skin tone, head shape) close to the original.

Slightly enlarge the head for a comical cartoon look while keeping structure.

Add crossed, playful cartoon eyes with visible white space, matching the original size and direction.

Overlay a silly open mouth with blue cartoon drool, without altering the real mouth shape.

Preserve original skin tone exactly.

Redraw hair, ears, eyebrows in a hand-drawn sketch style, keeping structure intact.

Add a visible “LOWIQ” parody badge on clothing in a comic, sketchy style.

Use a cartoonish style with shaky outlines, no shading, and pastel or clashing colors.

Do not modify clothing, body, background, or pose
`.trim();

  if (!imageUrl) {
    return res.status(400).json({ error: "Missing imageUrl" });
  }

  try {
    console.log("Image URL received:", imageUrl);
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Failed to fetch image from Supabase");

    const imageBuffer = await imageRes.buffer();

    const formData = new FormData();
    formData.append("image", imageBuffer, {
      filename: "image.png",
      contentType: "image/png",
    });
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", "512x512");
    formData.append("quality", "high");
    formData.append("response_format", "url");
    formData.append("output_format", "png");

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    let result;
    try {
      result = await openaiRes.json();
    } catch (e) {
      const raw = await openaiRes.text();
      console.error("OpenAI non-JSON error:", raw);
      return res.status(500).json({ error: "Invalid response from OpenAI", raw });
    }

    if (!openaiRes.ok) {
      console.error("OpenAI error:", result);
      return res.status(500).json({ error: result.error?.message || "OpenAI failed" });
    }

    res.status(200).json({ resultUrl: result.data[0].url });
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
