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
import { transform, translate, scale, applyToPoint } from "transformation-matrix";

const WebcamCap: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);

  const alignFace = (landmarks: any[], canvasWidth: number, canvasHeight: number) => {
    const leftIris = getLandmarks(landmarks, [LEFT_IRIS_CENTER]);
    const rightIris = getLandmarks(landmarks, [RIGHT_IRIS_CENTER]);
    const noseTip = getLandmarks(landmarks, [NOSE_TIP]);

    if (!leftIris || !rightIris || !noseTip) {
      console.error("One or more landmarks are undefined.");
      return null;
    }

    const leftEyeCenter = { x: leftIris.x * canvasWidth, y: leftIris.y * canvasHeight };
    const rightEyeCenter = { x: rightIris.x * canvasWidth, y: rightIris.y * canvasHeight };

    const deltaX = rightEyeCenter.x - leftEyeCenter.x;
    const deltaY = rightEyeCenter.y - leftEyeCenter.y;
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    const desiredDist = 100; // Desired distance between eyes in pixels
    const currentDist = Math.sqrt(deltaX ** 2 + deltaY ** 2) || 1e-6;
    const scaleFactor = desiredDist / currentDist;

    const eyesCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };

    const scaleMatrix = scale(scaleFactor, scaleFactor);
    const translationMatrix = translate(
      canvasWidth / 2 - eyesCenter.x,
      canvasHeight / 2 - eyesCenter.y
    );

    const combinedMatrix = transform(scaleMatrix, translationMatrix);

    const transformedLandmarks = landmarks.map((lm: any) => {
      const transformedPoint = applyToPoint(combinedMatrix, {
        x: lm.x * canvasWidth,
        y: lm.y * canvasHeight,
      });

      return {
        x: transformedPoint.x / canvasWidth,
        y: transformedPoint.y / canvasHeight,
      };
    });

    return transformedLandmarks;
  };

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
            // const irisCenterLandmarks = getLandmarks(landmarks, [
            //   LEFT_IRIS_CENTER,
            //   RIGHT_IRIS_CENTER,
            // ]);
            // drawLandmarks(canvasCtx, irisCenterLandmarks, {
            //   color: "#FF0000",
            //   lineWidth: 1,
            // });
            // const eyeCornerLandmarks = getLandmarks(landmarks, [
            //   LEFT_EYE_CORNER,
            //   RIGHT_EYE_CORNER,
            // ]);
            // drawLandmarks(canvasCtx, eyeCornerLandmarks, {
            //   color: "#FF0000",
            //   lineWidth: 1,
            // });
            // const noseLandmarks = getLandmarks(landmarks, [NOSE_TIP]);
            // drawLandmarks(canvasCtx, noseLandmarks, {
            //   color: "#FF0000",
            //   lineWidth: 1,
            // });

            const transformedLandmarks = alignFace(
              landmarks,
              canvasElement.width,
              canvasElement.height
            );
            if (!transformedLandmarks) {
              console.error("Failed to transform landmarks.");
              continue;
            }
            
            // Extract only the specific five landmarks
            const specificLandmarks = [
              transformedLandmarks[LEFT_EYE_CORNER],
              transformedLandmarks[RIGHT_EYE_CORNER],
              transformedLandmarks[LEFT_IRIS_CENTER],
              transformedLandmarks[RIGHT_IRIS_CENTER],
              transformedLandmarks[NOSE_TIP],
            ];
            console.log("Transformed Specific Landmarks:", specificLandmarks);
            // Draw transformed landmarks
            specificLandmarks.forEach((point) => {
              drawLandmarks(canvasCtx, [point], {
                color: "#FF0000",
                lineWidth: 1,
              });
            });

            const { normX, normY, timestamp } = getNormalizedIrisPosition(
              transformedLandmarks,
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
          width="640"
          height="460"
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
