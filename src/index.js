const ytdl = require("ytdl-core");

const axios = require("axios");
const dotenv = require("dotenv");
const express = require("express");
dotenv.config();

const port = process.env.PORT || 3000;

const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getVideoTitle = async (videoId) => {
  const { data } = await axios.get(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YT_API_KEY}&part=snippet`
  );
  const metadata = data.items[0].snippet;
  const title = [metadata.channelTitle, metadata.title].join(" - ");
  return title;
};

const handleVideoDownload = async (videoId) => {
  const videoName = await getVideoTitle(videoId);

  const videoUrl = `http://www.youtube.com/watch?v=${videoId}`;
  const videoStream = ytdl(videoUrl, {
    filter: (format) => format.hasAudio && format.hasVideo,
  });

  return { videoStream, videoName };
};

app.post("/api/download", async (req, res) => {
  const { url } = req.body;
  const ytUrl = new URL(url);
  const videoId = ytUrl.searchParams.get("v");

  const { videoStream, videoName } = await handleVideoDownload(videoId);
  res.set({
    "Content-Disposition": `attachment; filename=${videoName}.mp4`,
    "Content-Type": "video/mp4",
  });
  videoStream.pipe(res);
});

app.get("/", (_req, res) => res.sendFile("index.html"));

app.listen(port, () => console.log(`Server running on port ${port}`));
