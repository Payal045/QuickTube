"""
transcriber.py  –  Flask micro‑service
1. Try auto‑captions via youtube‑transcript‑api (free, no key)
2. Fallback: download audio (yt‑dlp) → transcribe with Whisper (local)
   Whisper model can be switched via WHISPER_MODEL env var (default “base”)
"""

from flask import Flask, request, jsonify
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
import subprocess, os, tempfile, whisper, re, logging, shutil

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

YT_ID_REGEX = re.compile(r"(?:v=|youtu\.be/|embed/)([\w-]{11})")

@app.route("/transcribe", methods=["POST"])
def transcribe():
    data = request.get_json(silent=True) or {}
    url = data.get("videoUrl")
    if not url:
        return jsonify(error="Missing videoUrl"), 400

    match = YT_ID_REGEX.search(url)
    if not match:
        return jsonify(error="Invalid YouTube URL"), 400
    video_id = match.group(1)

    # 1️⃣  Try YouTube captions
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        text = " ".join(item["text"] for item in transcript)
        logging.info("✅ Captions found for %s", video_id)
        return jsonify(transcript=text, source="captions")
    except TranscriptsDisabled:
        logging.warning("⚠️  Captions disabled, using Whisper for %s", video_id)
    except Exception as e:
        logging.warning("⚠️  Caption fetch error: %s", e)

    # 2️⃣  Fallback: yt‑dlp + Whisper
    with tempfile.TemporaryDirectory() as tmpdir:
        mp3_path = os.path.join(tmpdir, f"{video_id}.mp3")

        # 2‑a Download audio
        try:
            subprocess.run(
                ["yt-dlp", "-f", "bestaudio",
                 "--extract-audio", "--audio-format", "mp3",
                 url, "-o", mp3_path],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            logging.error("yt‑dlp error: %s", e.stderr.decode()[:200])
            return jsonify(error="Audio download failed"), 500

        # 2‑b Transcribe with Whisper
        try:
            model = whisper.load_model(WHISPER_MODEL)
            result = model.transcribe(mp3_path)
            text = result["text"]
            language = result.get("language", "unknown")
            return jsonify(transcript=text, source="whisper", language=language)
        except Exception as e:
            logging.error("Whisper error: %s", e)
            return jsonify(error="Whisper transcription failed"), 500


if __name__ == "__main__":
    # If running standalone (not via gunicorn), host = 0.0.0.0 for Docker friendliness
    app.run(host="0.0.0.0", port=6000)
