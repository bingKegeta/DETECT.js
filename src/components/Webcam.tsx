import React, { useRef, useEffect } from 'react';
import { FaceMesh, type Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawLandmarks } from '@mediapipe/drawing_utils';

const LEFT_IRIS_CENTER = 468;
const LEFT_EYE_CORNER = 33;
const RIGHT_EYE_CORNER = 263;
const RIGHT_IRIS_CENTER = 473;
const NOSE_TIP = 4;

interface IrisPosition {
  normX: number;
  normY: number;
  timestamp: number;
}

const WebcamCap: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement?.getContext('2d') ?? null;

    if (videoElement && canvasElement && canvasCtx) {
      faceMeshRef.current = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
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
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            const irisCenterLandmarks = getLandmarks(landmarks, [LEFT_IRIS_CENTER, RIGHT_IRIS_CENTER]);
            drawLandmarks(canvasCtx, irisCenterLandmarks, { color: '#FF0000', lineWidth: 1 });
            const eyeCornerLandmarks = getLandmarks(landmarks, [LEFT_EYE_CORNER, RIGHT_EYE_CORNER]);
            drawLandmarks(canvasCtx, eyeCornerLandmarks, { color: '#FF0000', lineWidth: 1 });
            const noseLandmarks = getLandmarks(landmarks, [NOSE_TIP]);
            drawLandmarks(canvasCtx, noseLandmarks, { color: '#FF0000', lineWidth: 1 });

            const { normX, normY, timestamp } = getNormalizedIrisPosition(landmarks, canvasElement.width, canvasElement.height);
            console.log(`Normalized Iris Position: X: ${normX}, Y: ${normY}, Timestamp: ${timestamp}`);
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
      const canvasCtx = canvasRef.current.getContext('2d');
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const getLandmarks = (landmarks: any[], indices: number[]): any[] => {
    return indices.map((index) => landmarks[index]);
  };

  const getNormalizedIrisPosition = (faceLandmarks: any[], imgW: number, imgH: number): IrisPosition => {
    const leftIris = faceLandmarks[LEFT_IRIS_CENTER];
    const rightIris = faceLandmarks[RIGHT_IRIS_CENTER];

    const irisX = (leftIris.x + rightIris.x) / 2;
    const irisY = (leftIris.y + rightIris.y) / 2;

    const nose = faceLandmarks[NOSE_TIP];
    const noseX = nose.x;
    const noseY = nose.y;

    const relX = irisX - noseX;
    const relY = noseY - irisY;

    const leftEye = faceLandmarks[LEFT_EYE_CORNER];
    const rightEye = faceLandmarks[RIGHT_EYE_CORNER];
    const interOcularDistance = Math.sqrt(
      Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
    );

    const normX = relX / interOcularDistance;
    const normY = relY / interOcularDistance;
    const timestamp = performance.now();

    return { normX, normY, timestamp };
  };

  return (
    <div>
      <video ref={videoRef} width="640" height="480" autoPlay style={{ display: 'none' }}></video>
      <canvas ref={canvasRef} width="640" height="480"></canvas>
      <button
        onClick={startCapture}
        className="relative p-4 m-4 overflow-hidden rounded-md border border-indigo-600 text-indigo-600 shadow-2xl transition-all duration-200 before:absolute before:bottom-0 before:left-0 before:right-0 before:top-0 before:m-auto before:h-0 before:w-0 before:rounded-sm before:bg-indigo-600 before:duration-300 before:ease-out hover:text-white hover:shadow-indigo-600 hover:before:h-40 hover:before:w-40 hover:before:opacity-80"
      >
        Start
      </button>
      <button
        onClick={stopCapture}
        className="relative p-4 m-4 overflow-hidden rounded-md border border-indigo-600 text-indigo-600 shadow-2xl transition-all duration-200 before:absolute before:bottom-0 before:left-0 before:right-0 before:top-0 before:m-auto before:h-0 before:w-0 before:rounded-sm before:bg-indigo-600 before:duration-300 before:ease-out hover:text-white hover:shadow-indigo-600 hover:before:h-40 hover:before:w-40 hover:before:opacity-80"
      >
        Stop
      </button>
    </div>
  );
};

export default WebcamCap;
