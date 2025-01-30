<script lang="ts">
    import { onMount } from "svelte";
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
  
    let videoEl: HTMLVideoElement;
    let canvasEl: HTMLCanvasElement;
  
    let camera: Camera | null = null;
    let faceMesh: FaceMesh | null = null;
  
    // Called when user clicks "Start"
    function startCapture() {
      if (!camera && faceMesh && videoEl) {
        camera = new Camera(videoEl, {
          onFrame: async () => {
            if (faceMesh && videoEl) {
              await faceMesh.send({ image: videoEl });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
      }
    }
  
    // Called when user clicks "Stop"
    function stopCapture() {
      if (camera && canvasEl) {
        camera.stop();
        camera = null;
        const canvasCtx = canvasEl.getContext("2d");
        if (canvasCtx) {
          canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        }
      }
    }
  
    // Svelte lifecycle: runs once the component is mounted in the DOM
    onMount(() => {
      const canvasCtx = canvasEl.getContext("2d");
      if (!canvasCtx) return;
  
      // Initialize FaceMesh
      faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
  
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
  
      // Handle FaceMesh results (draw them onto the canvas)
      faceMesh.onResults((results: Results) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
  
        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            // Draw key landmarks: iris centers, eye corners, nose tip
            const irisCenters = getLandmarks(landmarks, [
              LEFT_IRIS_CENTER,
              RIGHT_IRIS_CENTER,
            ]);
            drawLandmarks(canvasCtx, irisCenters, {
              color: "#FF0000",
              lineWidth: 1,
            });
  
            const eyeCorners = getLandmarks(landmarks, [
              LEFT_EYE_CORNER,
              RIGHT_EYE_CORNER,
            ]);
            drawLandmarks(canvasCtx, eyeCorners, {
              color: "#FF0000",
              lineWidth: 1,
            });
  
            const noseTip = getLandmarks(landmarks, [NOSE_TIP]);
            drawLandmarks(canvasCtx, noseTip, {
              color: "#FF0000",
              lineWidth: 1,
            });
  
            // Change processing here
            const { normX, normY, timestamp } = getNormalizedIrisPosition(
              landmarks,
              canvasEl.width,
              canvasEl.height
            );
            console.log(
              `Normalized Iris Position: X: ${normX}, Y: ${normY}, Timestamp: ${timestamp}`
            );
          }
        }
        canvasCtx.restore();
      });
    });
  </script>
  
  <div class="border-secondary rounded-lg border-2 opacity-90 shadow-lg size-fit">
    <div class="border-b-2 border-accent-magenta">
      <!-- Hidden video element where Mediapipe reads frames -->
      <video
        bind:this={videoEl}
        width="640"
        height="480"
        autoplay
        style="display: none;"
      >
        <track kind="captions" />
      </video>
  
      <!-- Canvas to draw the video feed and landmarks -->
      <canvas
        bind:this={canvasEl}
        width="640"
        height="460"
        class="m-2 rounded shadow-lg bg-base-300 border-2 border-accent"
      ></canvas>
    </div>
  
    <div class="flex w-full font-semibold text-lg">
      <button
        on:click={startCapture}
        class="bg-neutral m-2 ml-3 py-2 rounded-md w-full transition-transform transform-gpu
               border-4 border-success text-neutral-content
               hover:bg-success hover:scale-105 hover:shadow-lg hover:text-success-content
               hover:border-4 hover:border-neutral duration-500"
      >
        Start
      </button>
      <button
        on:click={stopCapture}
        class="bg-neutral m-2 mr-3 py-2 rounded-md w-full transition-transform transform-gpu
               border-4 border-error text-neutral-content
               hover:bg-error hover:scale-105 hover:shadow-lg hover:text-error-content
               hover:border-4 hover:border-neutral duration-500"
      >
        Stop
      </button>
    </div>
  </div>
  