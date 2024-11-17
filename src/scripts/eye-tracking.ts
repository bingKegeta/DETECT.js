// src/scripts/landmarkProcessing.ts
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

const LEFT_IRIS_CENTER = 468;
const LEFT_EYE_CORNER = 33;
const RIGHT_EYE_CORNER = 263;
const RIGHT_IRIS_CENTER = 473;
const NOSE_TIP = 4;

let camera: Camera | null = null;
let faceMesh: FaceMesh;

interface IrisPosition {
  normX: number;
  normY: number;
  timestamp: number;
}

function getLandmarks(landmarks: any[], indices: number[]): any[] {
  return indices.map(index => landmarks[index]);
}

function getNormalizedIrisPosition(faceLandmarks: any, imgW: number, imgH: number): IrisPosition {
  // Extract iris centers
  const leftIris = faceLandmarks[LEFT_IRIS_CENTER];
  const rightIris = faceLandmarks[RIGHT_IRIS_CENTER];

  // Compute average iris center
  const irisX = (leftIris.x + rightIris.x) / 2;
  const irisY = (leftIris.y + rightIris.y) / 2;

  // Extract nose tip
  const nose = faceLandmarks[NOSE_TIP];
  const noseX = nose.x;
  const noseY = nose.y;

  // Compute relative position
  const relX = irisX - noseX;
  const relY = noseY - irisY;

  // Normalize relative to inter-ocular distance (distance between eyes)
  const leftEye = faceLandmarks[LEFT_EYE_CORNER];
  const rightEye = faceLandmarks[RIGHT_EYE_CORNER];
  const interOcularDistance = Math.sqrt(
    Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
  );

  const normX = relX / interOcularDistance;
  const normY = relY / interOcularDistance;
  const timestamp = performance.now();

  return { normX, normY, timestamp };
}

window.addEventListener('load', () => {
  const videoElement = document.getElementById('video') as HTMLVideoElement;
  const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
  const canvasCtx = canvasElement?.getContext('2d') ?? null;

  if (videoElement && canvasElement && canvasCtx) {
    faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
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

  document.getElementById('startButton')?.addEventListener('click', startCapture);
  document.getElementById('stopButton')?.addEventListener('click', stopCapture);

  function startCapture() {
    if (!camera && videoElement && faceMesh) {
      camera = new Camera(videoElement, {
        onFrame: async () => {
          await faceMesh.send({ image: videoElement });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }

  function stopCapture() {
    if (camera && canvasCtx && canvasElement) {
      camera.stop();
      camera = null;
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
  }
});
