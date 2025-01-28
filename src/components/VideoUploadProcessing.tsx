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
  const websocketRef = useRef<WebSocket | null>(null); // WebSocket reference
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Initialize WebSocket connection
    websocketRef.current = new WebSocket("ws://localhost:8080"); // Replace with your WebSocket server URL

    websocketRef.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    websocketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    websocketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      // Clean up WebSocket connection on unmount
      websocketRef.current?.close();
    };
  }, []);

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

            // Send eye-tracking data to WebSocket
            const data = {
              x: normX.toFixed(4),
              y: normY.toFixed(4),
              second: timestamp.toFixed(3),
            };

            if (websocketRef.current?.readyState === WebSocket.OPEN) {
              websocketRef.current.send(JSON.stringify(data));
            }

            console.log(`Data sent: ${JSON.stringify(data)}`);
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
    <div className="flex flex-col items-center justify-center border-accent-magenta rounded-lg border-2 opacity-90 shadow-glow bg-base-light dark:bg-base">
      <input
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="flex text-white dark:text-gray-300 p-2 bg-gradient-to-b from-accent-magenta to-accent-green rounded-md w-fit my-2 shadow-glow hover:scale-105 transition-transform"
      />
      <div className="border-b-2 border-accent-magenta">
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
          className="m-2 rounded bg-gradient-to-r from-accent-cyan via-accent-magenta to-accent-green shadow-glow"
        ></canvas>
      </div>
      {videoLoaded && (
        <div className="flex w-full font-semibold text-lg text-white dark:text-gray-300">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className={`bg-accent-cyan m-2 ml-3 my-2 py-4 rounded-md w-full h-full text-black dark:text-white 
                    hover:bg-accent-green hover:scale-105 hover:shadow-glow transition-transform ${
                      isPlaying ? "opacity-50 cursor-not-allowed" : ""
                    }`}
          >
            Play
          </button>
          <button
            onClick={handlePause}
            disabled={!isPlaying}
            className={`bg-accent-yellow m-2 py-4 rounded-md w-full h-full text-black dark:text-white 
                    hover:bg-accent-orange hover:scale-105 hover:shadow-glow transition-transform ${
                      !isPlaying ? "opacity-50 cursor-not-allowed" : ""
                    }`}
          >
            Pause
          </button>
          <button
            onClick={handleStop}
            disabled={isPlaying}
            className={`bg-accent-magenta m-2 mr-3 py-4 rounded-md w-full h-full text-black dark:text-white 
                    hover:bg-accent-red hover:scale-105 hover:shadow-glow-magenta transition-transform ${
                      isPlaying ? "opacity-50 cursor-not-allowed" : ""
                    }`}
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUploadProcessing;
