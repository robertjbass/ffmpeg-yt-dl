const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { rimraf } = require("rimraf");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const videos = [
  {
    id: "yLNpy62jIFk",
  },
  {
    id: "XI7Cxdj2pAQ",
  },
];

const getVideoTitle = async (videoId) => {
  const { data } = await axios.get(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YT_API_KEY}&part=snippet`
  );
  const metadata = data.items[0].snippet;
  const title = [metadata.channelTitle, metadata.title].join(" - ");
  return title;
};

//! Requires FFMPEG to be installed on server
const downloadVideosWithMergedAudio = (videos) => {
  if (!fs.existsSync("./videos/")) fs.mkdirSync("./videos/");
  if (!fs.existsSync("./audios/")) fs.mkdirSync("./audios/");
  if (!fs.existsSync("./output/")) fs.mkdirSync("./output/");

  const videoPromises = videos.map(async (video) => {
    const videoName = await getVideoTitle(video.id);

    const audioOutput = `./audios/${videoName}.mp3`;
    const audioStream = ytdl(`http://www.youtube.com/watch?v=${video.id}`, {
      quality: "highestaudio",
    });

    const output = `./videos/${videoName}.mp4`;
    const videoUrl = `http://www.youtube.com/watch?v=${video.id}`;
    const videoStream = ytdl(videoUrl, {
      filter: (format) => {
        return format.container === "mp4" && format.hasAudio && format.hasVideo;
      },
    });

    const audioPath = `./audios/${videoName}.mp3`;
    const videoPath = `./videos/${videoName}.mp4`;
    const outputPath = `./output/${videoName}.mp4`;

    const audioDownloadPromise = new Promise((resolve, reject) => {
      ffmpeg(audioStream)
        .audioBitrate(128)
        .format("mp3")
        .on("progress", (p) => {
          console.log(`audio progress: ${p.targetSize}KB downloaded`);
        })
        .on("end", () => {
          console.log("Processing...");
          resolve();
        })
        .on("error", (error) => {
          console.error("Error occurred: " + error.message);
          reject(error);
        })
        .save(audioOutput);
    });

    const videoDownloadPromise = new Promise((resolve, reject) => {
      ffmpeg(videoStream)
        .on("progress", (p) => {
          console.log(`video progress: ${p.targetSize}KB downloaded`);
        })
        .on("error", (error) => {
          console.error(error);
          reject(error);
        })
        .on("end", () => {
          console.log("Processing...");
          resolve();
        })
        .save(output);
    });

    return Promise.all([audioDownloadPromise, videoDownloadPromise]).then(
      () => {
        return new Promise((resolve, reject) => {
          ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions("-c:v copy") // copy the original video codec
            .outputOptions("-c:a aac") // re-encode the audio to aac
            .outputOptions("-map 0:v") // use the video from the video file
            .outputOptions("-map 1:a") // use the audio from the audio file
            .on("progress", (p) => {
              console.log(`merge progress: ${p.targetSize}KB merged`);
            })
            .on("error", (error) => {
              console.error(error);
              reject(error);
            })
            .on("end", () => {
              console.log("Processing...");
              resolve();
            })
            .save(outputPath);
        });
      }
    );
  });

  return Promise.all(videoPromises);
};

const downloadVideos = async (videos) => {
  if (!fs.existsSync("./output/")) fs.mkdirSync("./output/");

  for (const video of videos) {
    const videoName = await getVideoTitle(video.id);
    const outputPath = `./output/${videoName}.mp4`;
    const videoUrl = `http://www.youtube.com/watch?v=${video.id}`;
    const videoStream = ytdl(videoUrl, {
      filter: (format) => format.hasAudio && format.hasVideo,
    });

    videoStream.pipe(fs.createWriteStream(`${outputPath}`));
  }
};

downloadVideos(videos);

const downloadAudioAndVideoSeparately = false;
if (downloadAudioAndVideoSeparately) {
  downloadVideosWithMergedAudio(videos)
    .then(() => {
      console.log("All videos processed");
    })
    .catch((error) => {
      console.error("An error occurred: ", error);
    })
    .finally(() => {
      rimraf("./videos/", {});
      rimraf("./audios/", {});
    });
}
