import React, { useRef, useEffect } from "react";
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
  }, []);

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
    }
  };

  return (
    <div className="border-ctp-pink rounded-lg border-2 opacity-85">
      <div className="border-b-2 border-ctp-pink">
        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          style={{ display: "none" }}
        ></video>
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          className="m-2 rounded"
        ></canvas>
      </div>
      <div className="flex w-full font-semibold text-lg">
        <button
          onClick={startCapture}
          className="bg-ctp-sapphire m-2 ml-3 my-2 py-4 rounded-md w-full h-full text-ctp-base/60 
          hover:bg-ctp-green hover:scale-105 hover:text-ctp-base/80"
        >
          Start
        </button>
        <button
          onClick={stopCapture}
          className="bg-ctp-peach m-2 mr-3 py-4 rounded-md w-full h-full text-ctp-base/60 
          hover:bg-ctp-red hover:scale-105 hover:text-ctp-base/80"
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default WebcamCap;
