import React, { useRef, useEffect, useState } from "react";
import { FaceMesh, type Results } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
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

const WebcamCap: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // WebSocket setup
  const websocket = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    websocket.current = new WebSocket("ws://localhost:8080");
    websocket.current.onopen = () => console.log("WebSocket connection established");
    websocket.current.onclose = () => console.log("WebSocket connection closed");
    websocket.current.onerror = (error) => console.error("WebSocket error:", error);

    return () => {
      websocket.current?.close();
    };
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement?.getContext("2d") ?? null;

    if (videoElement && canvasElement && canvasCtx) {
      faceMeshRef.current = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
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

            const { normX, normY } = getNormalizedIrisPosition(
              landmarks,
              canvasElement.width,
              canvasElement.height
            );

            if (startTime !== null) {
              const elapsedSeconds = ((performance.now() - startTime) / 1000).toFixed(3);
              const data = {
                x: normX,
                y: normY,
                second: Number(elapsedSeconds),
                isUploadedVideo: false,  // webcam video flag
                videoDuration: 0,  // not needed for webcam
              };

              if (websocket.current?.readyState === WebSocket.OPEN) {
                const message = JSON.stringify(data); // Sending as JSON
                websocket.current.send(message);
              }
            }
          }
        }
        canvasCtx.restore();
      });
    }
  }, [startTime]);

  const startCapture = () => {
    if (!cameraRef.current && videoRef.current && faceMeshRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current! });
          }
        },
        width: 640,
        height: 480,
      });
      cameraRef.current.start();
      setStartTime(performance.now());
      setIsPlaying(true);
    }
  };

  const stopCapture = () => {
    if (cameraRef.current && canvasRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
      const canvasCtx = canvasRef.current.getContext("2d");
      if (canvasCtx) {
        canvasCtx.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }
      setIsPlaying(false);
    }
  };

  return (
    <div className="border-secondary rounded-lg border-2 opacity-90 shadow-lg size-fit">
      <div className="border-b-2 border-accent-magenta">
        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          style={{ display: "none" }}
        ></video>
        <canvas
          ref={canvasRef}
          width="600"
          height="250"
          className="m-2 rounded shadow-lg bg-base-300 border-2 border-accent"
        ></canvas>
      </div>
      <div className="flex w-full font-semibold text-lg text-white dark:text-gray-300">
        <button
          onClick={startCapture}
          className="bg-neutral m-2 ml-3 py-2 rounded-md w-full transition-transform transform-gpu
                 border-4 border-success text-neutral-content
                 hover:bg-success hover:scale-105 hover:shadow-lg hover:text-success-content
                 hover:border-4 hover:border-neutral duration-500"
        >
          Start
        </button>
        <button
          onClick={stopCapture}
          className="bg-neutral m-2 mr-3 py-2 rounded-md w-full transition-transform transform-gpu
                 border-4 border-error text-neutral-content
                 hover:bg-error hover:scale-105 hover:shadow-lg hover:text-error-content
                 hover:border-4 hover:border-neutral duration-500"
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default WebcamCap;
