const { YoutubeTranscript } = require('youtube-transcript'); // new
const { execFile } = require('child_process');               // for Whisper fallback

router.post('/summarize', async (req, res) => {
  const { videoUrl } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'Video URL required' });

  const videoId = getVideoIdFromUrl(videoUrl);
  if (!videoId) return res.status(400).json({ error: 'Invalid URL' });

  try {
    /* ---------- 1. Try to fetch YouTube captions (free) ---------- */
    let transcriptText = '';
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcript.map(t => t.text).join(' ');
    } catch {
      console.log('No captions. Falling back to Whisper…');
    }

    /* ---------- 2. If no captions, download audio & whisper ---------- */
    if (!transcriptText) {
      const tmpMp3 = `/tmp/${videoId}.mp3`;
      // 2‑a download audio (ytdl-core + ffmpeg) — omitted for brevity
      // await downloadAudio(videoUrl, tmpMp3);

      // 2‑b run whisper (small model) locally
      transcriptText = await whisperTranscribe(tmpMp3); // helper below
    }

    if (!transcriptText) {
      return res.status(400).json({ error: 'Could not obtain transcript' });
    }

    /* ---------- 3. Summarise with HF ----------------------------- */
    const model = 'facebook/bart-large-cnn';
    const hfRes = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: transcriptText },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
    );

    const summary = hfRes.data[0]?.summary_text || 'No summary generated';

    // Save to history
    await History.create({ query: videoUrl, summary });

    return res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to summarise video.' });
  }
});

/* ——— Whisper helper (CPU) ——— */
function whisperTranscribe(pathToMp3) {
  return new Promise((resolve, reject) => {
    execFile('whisper', [pathToMp3, '--model', 'small', '--language', 'en', '--output_format', 'txt', '--temperature', '0'], (err) => {
      if (err) return reject(err);
      // whisper outputs pathToMp3.txt in same dir
      const fs = require('fs');
      const text = fs.readFileSync(`${pathToMp3}.txt`, 'utf8');
      resolve(text);
    });
  });
}

console.log("Summarize route loaded successfully!");

module.exports = router;



