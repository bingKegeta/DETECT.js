import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

const videoElement = document.getElementById('video') as HTMLVideoElement;
const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext('2d');
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const stopButton = document.getElementById('stopButton') as HTMLButtonElement;

let camera: Camera | null = null;

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults((results) => {
  canvasCtx!.save();
  canvasCtx!.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx!.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      // drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
      // drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_EYE, { color: '#FF3030' });
      // drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_EYEBROW, { color: '#FF3030' });
      // drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_LEFT_EYE, { color: '#30FF30' });
      // drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_LEFT_EYEBROW, { color: '#30FF30' });
      // drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_FACE_OVAL, { color: '#E0E0E0' });
      // drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_LIPS, { color: '#E0E0E0' });
      drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
    }
  }
  canvasCtx!.restore();
});

startButton.addEventListener('click', () => {
  if (!camera) {
    camera = new Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
    camera.start();
  }
});

stopButton.addEventListener('click', () => {
  if (camera) {
    camera.stop();
    camera = null;
    canvasCtx!.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }
});
