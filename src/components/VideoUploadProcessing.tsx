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
import { transform, translate, scale, applyToPoint } from "transformation-matrix";

const VideoUploadProcessing: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [key, setKey] = useState(0);

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
            
            console.log("Original Landmarks:", landmarks);
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

            // Log normalized coordinates for debugging
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
