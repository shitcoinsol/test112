import { FormData, fileFrom } from 'undici';

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageUrl } = req.body;

  const prompt = "Transform only the face and head of the person in the image into a lighthearted cartoon parody, keeping facial features (eyes, nose, mouth, skin tone, head shape) close to the original. Slightly enlarge the head for a comical cartoon look while keeping structure. Add crossed, playful cartoon eyes with visible white space, matching the original size and direction. Overlay a silly open mouth with blue cartoon drool, without altering the real mouth shape. Preserve original skin tone exact...

  if (!imageUrl) {
    return res.status(400).json({ error: "Missing imageUrl" });
  }

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch image from Supabase");

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageFile = await fileFrom(Buffer.from(imageArrayBuffer), "image.png", { type: "image/png" });

    const formData = new FormData();
    formData.set("image", imageFile);
    formData.set("prompt", prompt);
    formData.set("n", "1");
    formData.set("size", "512x512");
    formData.set("quality", "high");
    formData.set("response_format", "url");
    formData.set("output_format", "png");

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    let result;
    try {
      result = await openaiRes.json();
    } catch (e) {
      const raw = await openaiRes.text();
      console.error("OpenAI non-JSON response:", raw);
      return res.status(500).json({ error: "Invalid OpenAI response", raw });
    }

    if (!openaiRes.ok) {
      console.error("OpenAI error:", result);
      return res.status(500).json({ error: result.error?.message || "OpenAI failed" });
    }

    return res.status(200).json({ resultUrl: result.data[0].url });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
