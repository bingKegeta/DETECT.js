// src/scripts/mediapipe.ts

import { FaceMesh } from "@mediapipe/face_mesh";
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
} from "./utils";

export class MediaPipeProcessor {
  videoEl: HTMLVideoElement;
  canvasEl: HTMLCanvasElement;
  faceMesh: FaceMesh | null = null;
  camera: Camera | null = null;

  constructor(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
  }

  initializeFaceMesh() {
    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  startCamera(onFrame: Function) {
    if (!this.camera && this.faceMesh && this.videoEl) {
      this.camera = new Camera(this.videoEl, {
        onFrame: async () => {
          if (this.faceMesh && this.videoEl) {
            await this.faceMesh.send({ image: this.videoEl });
            onFrame();
          }
        },
        width: 640,
        height: 480,
      });
      this.camera.start();
    }
  }

  stopCamera() {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
  }

  processResults(results: any) {
    const canvasCtx = this.canvasEl.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    canvasCtx.drawImage(results.image, 0, 0, this.canvasEl.width, this.canvasEl.height);

    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        const irisCenters = getLandmarks(landmarks, [
          LEFT_IRIS_CENTER,
          RIGHT_IRIS_CENTER,
        ]);
        drawLandmarks(canvasCtx, irisCenters, { color: "#FF0000", lineWidth: 1 });

        const eyeCorners = getLandmarks(landmarks, [
          LEFT_EYE_CORNER,
          RIGHT_EYE_CORNER,
        ]);
        drawLandmarks(canvasCtx, eyeCorners, { color: "#FF0000", lineWidth: 1 });

        const noseTip = getLandmarks(landmarks, [NOSE_TIP]);
        drawLandmarks(canvasCtx, noseTip, { color: "#FF0000", lineWidth: 1 });

        const { normX, normY, timestamp } = getNormalizedIrisPosition(
          landmarks,
          this.canvasEl.width,
          this.canvasEl.height
        );

        const timestampInSeconds = timestamp / 1000;
        const metrics = { x: normX, y: normY, time: timestampInSeconds };

        return metrics;
      }
    }
    canvasCtx.restore();
  }
}
