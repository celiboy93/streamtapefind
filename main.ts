import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Streamtape Only Movie Filter</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #0f172a;
      color: #e5e7eb;
      padding: 20px;
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 18px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    }
    h1 {
      margin: 0 0 10px;
      font-size: 28px;
    }
    p {
      color: #94a3b8;
      line-height: 1.6;
    }
    textarea {
      width: 100%;
      min-height: 320px;
      border: 1px solid #334155;
      background: #020617;
      color: #f8fafc;
      border-radius: 12px;
      padding: 14px;
      font-size: 14px;
      resize: vertical;
      outline: none;
    }
    button {
      border: none;
      background: #2563eb;
      color: white;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 14px;
      cursor: pointer;
      margin-right: 10px;
      margin-top: 12px;
    }
    button:hover { background: #1d4ed8; }
    .secondary { background: #334155; }
    .secondary:hover { background: #475569; }
    .result-box {
      white-space: pre-wrap;
      background: #020617;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 14px;
      min-height: 220px;
      font-size: 14px;
      line-height: 1.7;
      color: #f8fafc;
    }
    .stats {
      margin: 10px 0 14px;
      color: #cbd5e1;
      font-size: 14px;
    }
    .muted {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Streamtape Only Movie Filter</h1>
      <p>
        JSON data paste ထည့်ပါ။ ဒီ tool က <b>files.stream + files.download</b> ထဲမှာ
        <b>streamtape links ပဲရှိတဲ့ movie titles</b> တွေကိုပဲ ထုတ်ပေးပါမယ်။
      </p>
      <p class="muted">
        profileImg, coverImg, links, trailer တို့ကို မစစ်ပါ။
      </p>
    </div>

    <div class="card">
      <h3>Input JSON</h3>
      <textarea id="input" placeholder='JSON data paste here...'></textarea>
      <div>
        <button onclick="runFilter()">Filter Now</button>
        <button class="secondary" onclick="copyResult()">Copy Result</button>
        <button class="secondary" onclick="clearAllData()">Clear</button>
      </div>
    </div>

    <div class="card">
      <h3>Result</h3>
      <div class="stats" id="stats">No result yet.</div>
      <div id="result" class="result-box"></div>
    </div>
  </div>

  <script>
    function safeJsonParse(value, fallback) {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }

    function getMoviesRoot(parsed) {
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.movies)) return parsed.movies;
      if (Array.isArray(parsed.data)) return parsed.data;
      if (Array.isArray(parsed.results)) return parsed.results;
      return null;
    }

    function normalizeHost(url) {
      try {
        return new URL(url).hostname.toLowerCase().replace(/^www\\./, "");
      } catch {
        return "";
      }
    }

    function isStreamtapeUrl(url) {
      const host = normalizeHost(url);
      return host.includes("streamtape");
    }

    function extractPlayableUrls(movie) {
      let files = movie.files;

      if (typeof files === "string") {
        files = safeJsonParse(files, null);
      }

      if (!files || typeof files !== "object") return [];

      const stream = Array.isArray(files.stream) ? files.stream : [];
      const download = Array.isArray(files.download) ? files.download : [];

      const urls = [];

      for (const item of [...stream, ...download]) {
        if (item && typeof item.url === "string" && item.url.trim()) {
          urls.push(item.url.trim());
        }
      }

      return urls;
    }

    function getTitle(movie, index) {
      const title = movie.title || movie.name || movie.movie_title || movie.code || ("Untitled #" + (index + 1));
      return String(title).trim();
    }

    function runFilter() {
      const inputEl = document.getElementById("input");
      const resultEl = document.getElementById("result");
      const statsEl = document.getElementById("stats");

      resultEl.textContent = "";
      statsEl.textContent = "Processing...";

      let parsed;
      try {
        parsed = JSON.parse(inputEl.value);
      } catch (err) {
        resultEl.textContent = "JSON parse error: " + err.message;
        statsEl.textContent = "Failed.";
        return;
      }

      const movies = getMoviesRoot(parsed);
      if (!movies) {
        resultEl.textContent = "Movie array မတွေ့ပါ။ Root array ဖြစ်ရမယ်၊ သို့မဟုတ် movies/data/results ထဲမှာ array ဖြစ်ရမယ်။";
        statsEl.textContent = "Invalid movie list.";
        return;
      }

      const matchedTitles = [];

      movies.forEach((movie, index) => {
        const urls = extractPlayableUrls(movie);
        if (!urls.length) return;

        const uniqueUrls = [...new Set(urls)];
        const hasStreamtape = uniqueUrls.some(isStreamtapeUrl);
        const allStreamtape = uniqueUrls.every(isStreamtapeUrl);

        if (hasStreamtape && allStreamtape) {
          matchedTitles.push(getTitle(movie, index));
        }
      });

      if (!matchedTitles.length) {
        resultEl.textContent = "streamtape only movie မတွေ့ပါ။";
        statsEl.textContent = \`Total movies: \${movies.length} | Matched: 0\`;
        return;
      }

      resultEl.textContent = matchedTitles.join("\\n");
      statsEl.textContent = \`Total movies: \${movies.length} | Matched: \${matchedTitles.length}\`;
    }

    async function copyResult() {
      const text = document.getElementById("result").textContent || "";
      if (!text.trim()) {
        alert("Copy လုပ်ဖို့ result မရှိသေးပါ။");
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        alert("Copied!");
      } catch {
        alert("Copy failed.");
      }
    }

    function clearAllData() {
      document.getElementById("input").value = "";
      document.getElementById("result").textContent = "";
      document.getElementById("stats").textContent = "Cleared.";
    }
  </script>
</body>
</html>`;

serve(() => {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
});
