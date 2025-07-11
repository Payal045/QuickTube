// routes/summary.js
const express            = require("express");
const axios              = require("axios");
const { YoutubeTranscript } = require("youtube-transcript");
const History            = require("../models/History");

const router = express.Router();

/* -------------------------------------------------- */
/*  POST /api/summary/summarize                       */
/*  body = { videoUrl, mode?: "A" | "B" }             */
/* -------------------------------------------------- */
router.post("/summarize", async (req, res) => {
  const { videoUrl, mode = "A" } = req.body;   // mode defaults to A
  if (!videoUrl) return res.status(400).json({ error: "Video URL required" });

  const videoId = getVideoIdFromUrl(videoUrl);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  try {
    /* 1️⃣  TRANSCRIPT ---------------------------------------------------- */
    const transcript = await fetchTranscript(videoId, videoUrl);
    if (!transcript) return res.status(400).json({ error: "Transcript failed" });

    /* 2️⃣  CHUNKING ------------------------------------------------------ */
    const chunks = chunkText(transcript, 500);          // 500‑word chunks
    const chunkSummaries = [];

    /* 3️⃣  SUMMARIZE EACH CHUNK (BART) ---------------------------------- */
    for (const chunk of chunks) {
      const out = await callHF("facebook/bart-large-cnn", chunk);
      const sum = out?.[0]?.summary_text;
      if (sum) chunkSummaries.push(sum);
      else console.warn("⚠️ Empty chunk summary:", out);
    }

    if (!chunkSummaries.length)
      return res.status(500).json({ error: "Chunk summarization failed" });

    /* 4️⃣  MERGE & (optional) COMPRESS ---------------------------------- */
    let finalSummary;
    if (mode === "B") {
      // Hierarchical: compress merged summaries with Pegasus‑XSUM
      const merged = chunkSummaries.join(" ");
      const out = await callHF("google/pegasus-xsum", merged);
      finalSummary = out?.[0]?.summary_text || merged;
    } else {
      // Mode A: keep every chunk summary (full coverage)
      finalSummary = chunkSummaries.join("\n\n");
    }

    /* 5️⃣  SAVE  + RESPOND ---------------------------------------------- */
    await History.create({ query: videoUrl, summary: finalSummary });
    return res.json({ summary: finalSummary });

  } catch (err) {
    console.error("❌ Summarization failed:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* --------------------  HELPERS  -------------------------------------- */

// extract 11‑char YouTube ID
function getVideoIdFromUrl(url) {
  const re = /(?:youtu\.be\/|v=)([\w-]{11})/;
  const m  = url.match(re);
  return m ? m[1] : null;
}

// split text into ~maxWords chunks
function chunkText(text, maxWords = 500) {
  const words = text.split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

// captions → Whisper fallback
async function fetchTranscript(videoId, videoUrl) {
  try {
    const caps = await YoutubeTranscript.fetchTranscript(videoId);
    console.log("✅ Captions used");
    return caps.map(t => t.text).join(" ");
  } catch {
    console.log("⚠️ No captions, using Whisper …");
    const r = await axios.post(
      "http://localhost:6000/transcribe",
      { videoUrl },
      { timeout: 1000000 }
    );
    return r.data.transcript || "";
  }
}

// Hugging Face Inference API call
async function callHF(model, text) {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const hdr = {
    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
    "Content-Type": "application/json",
  };
  try {
    const r = await axios.post(url, { inputs: text }, { headers: hdr, timeout: 90000 });
    if (!Array.isArray(r.data)) {
      throw new Error(r.data.error || "Unexpected HF response shape");
    }
    return r.data;
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    throw new Error(`HF API error (${model}): ${msg}`);
  }
}

console.log("✅ /api/summary/summarize route (modes A & B) loaded");
module.exports = router;
