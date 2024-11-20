import React, { useRef, useEffect, useState } from "react";
import { FaceMesh, type Results } from "@mediapipe/face_mesh";
import { drawLandmarks } from "@mediapipe/drawing_utils";
import {
  LEFT_IRIS_CENTER,
  RIGHT_IRIS_CENTER,
  LEFT_EYE_CORNER,
  RIGHT_EYE_CORNER,
  NOSE_TIP,
  getNormalizedIrisPosition,
  getLandmarks,
} from "../scripts/utils";

const VideoUploadProcessing: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement?.getContext("2d") ?? null;

    if (canvasElement && canvasCtx) {
      faceMeshRef.current = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.43,
        minTrackingConfidence: 0.5,
      });

      faceMeshRef.current.onResults((results: Results) => {
        if (!canvasCtx) return;
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            const irisCenterLandmarks = getLandmarks(landmarks, [
              LEFT_IRIS_CENTER,
              RIGHT_IRIS_CENTER,
            ]);
            drawLandmarks(canvasCtx, irisCenterLandmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });
            const eyeCornerLandmarks = getLandmarks(landmarks, [
              LEFT_EYE_CORNER,
              RIGHT_EYE_CORNER,
            ]);
            drawLandmarks(canvasCtx, eyeCornerLandmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });
            const noseLandmarks = getLandmarks(landmarks, [NOSE_TIP]);
            drawLandmarks(canvasCtx, noseLandmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });

            const { normX, normY, timestamp } = getNormalizedIrisPosition(
              landmarks,
              canvasElement.width,
              canvasElement.height
            );
            console.log(
              `Normalized Iris Position: X: ${normX}, Y: ${normY}, Timestamp: ${timestamp}`
            );
          }
        }
        canvasCtx.restore();
      });
    }
  }, [key]);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.src = URL.createObjectURL(file);
      videoElement.onloadeddata = () => {
        setVideoLoaded(true);
        setIsPlaying(true);
        videoElement.play();
        processVideo();
      };
    }
  };

  const processVideo = () => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (videoElement && canvasElement && faceMeshRef.current) {
      const onVideoFrame = async () => {
        if (!videoElement.paused && !videoElement.ended) {
          await faceMeshRef.current!.send({ image: videoElement });
          requestAnimationFrame(onVideoFrame);
        }
      };
      requestAnimationFrame(onVideoFrame);
    }
  };

  const handlePlay = () => {
    if (videoRef.current) {
      setIsPlaying(true);
      videoRef.current.play();
      processVideo();
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      setIsPlaying(false);
      videoRef.current.pause();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setVideoLoaded(false);
    setKey((prevKey) => prevKey + 1);
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement?.getContext("2d") ?? null;
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, canvasElement!.width, canvasElement!.height);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center border-ctp-pink rounded-lg border-2 opacity-85 shadow-lg">
      <input
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="flex text-ctp-base/50 p-2 bg-gradient-to-b from-ctp-pink to-ctp-maroon rounded-md size-fit my-2"
      />
      <div className="border-b-2 border-ctp-pink">
        <video
          key={key}
          ref={videoRef}
          width="640"
          height="480"
          style={{ display: "none" }}
        ></video>
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          className="m-2 rounded"
        ></canvas>
      </div>
      {videoLoaded && (
        <div className="flex w-full font-semibold text-lg">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className="bg-ctp-teal m-2 ml-3 my-2 py-4 rounded-md w-full h-full text-ctp-base/60 
          hover:bg-ctp-green hover:scale-105 hover:text-ctp-base/80"
          >
            Play
          </button>
          <button
            onClick={handlePause}
            disabled={!isPlaying}
            className="bg-ctp-peach m-2 py-4 rounded-md w-full h-full text-ctp-base/60 
          hover:bg-ctp-yellow hover:scale-105 hover:text-ctp-base/80"
          >
            Pause
          </button>
          <button
            onClick={handleStop}
            disabled={isPlaying}
            className="bg-ctp-maroon m-2 mr-3 py-4 rounded-md w-full h-full text-ctp-base/60 
          hover:bg-ctp-red hover:scale-105 hover:text-ctp-base/80"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUploadProcessing;
