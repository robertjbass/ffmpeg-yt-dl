const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { rimraf } = require("rimraf");

// Set the path to ffmpeg executable if it's not in your PATH
// Uncomment the line below and replace 'path_to_ffmpeg' with the path to your ffmpeg executable
// ffmpeg.setFfmpegPath('path_to_ffmpeg');

if (!fs.existsSync("./videos/")) fs.mkdirSync("./videos/");
if (!fs.existsSync("./audios/")) fs.mkdirSync("./audios/");
if (!fs.existsSync("./output/")) fs.mkdirSync("./output/");

const videos = [
  {
    id: "yLNpy62jIFk",
    name: "Webdriver Torso 1",
  },
  {
    id: "XI7Cxdj2pAQ",
    name: "Webdriver Torso 2",
  },
];

const downloadVideos = (videos) => {
  const videoPromises = videos.map((video) => {
    const audioOutput = `./audios/${video.name}.mp3`;
    const audioStream = ytdl(`http://www.youtube.com/watch?v=${video.id}`, {
      quality: "highestaudio",
    });

    const output = `./videos/${video.name}.mp4`;
    const videoUrl = `http://www.youtube.com/watch?v=${video.id}`;
    const videoStream = ytdl(videoUrl, {
      filter: (format) => {
        return format.container === "mp4" && format.hasAudio && format.hasVideo;
      },
    });

    const audioPath = `./audios/${video.name}.mp3`;
    const videoPath = `./videos/${video.name}.mp4`;
    const outputPath = `./output/${video.name}.mp4`;

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

downloadVideos(videos)
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
