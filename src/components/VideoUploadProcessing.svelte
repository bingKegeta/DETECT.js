<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { FaceMesh } from "@mediapipe/face_mesh";
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

  // UI state variables
  let isPlaying = false;
  let videoLoaded = false;
  let isProcessing = false;

  // Offscreen processing variables
  let videoElement: HTMLVideoElement;
  let processingCanvas: HTMLCanvasElement;
  let offscreenCtx: CanvasRenderingContext2D | null;
  let faceMesh: FaceMesh;
  let animationFrameId: number;

  const canvasWidth = 640;
  const canvasHeight = 480;

  const WEBSOCKET_URL = "ws://localhost:9090/ws";

  let variance: number | null = null;

  let acceleration: number | null = null;

  let probability: number | null = null;

  let ws: WebSocket | null = null;

  function startWebSocket() {
    if (ws) ws.close(); // Ensure no duplicate connections

    ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => console.log("✅ WebSocket connected");

    ws.onclose = (event) => {
      console.log("❌ WebSocket disconnected", event);

      setTimeout(() => startWebSocket(), 3000); // Attempt reconnection
    };

    ws.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);

      ws?.close();
    };

    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);

      try {
        const data = JSON.parse(event.data);

        if (
          data.variance !== undefined &&
          data.acceleration !== undefined &&
          data.probability !== undefined
        ) {
          variance = data.variance;

          acceleration = data.acceleration;

          probability = data.probability;

          console.log("Received Metrics:", {
            variance,
            acceleration,
            probability,
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  function processFrame() {
    if (faceMesh && videoElement) {
      faceMesh.send({ image: videoElement });
    }
  }

  function onVideoPlay() {
    if (!faceMesh) return;

    videoElement.addEventListener("timeupdate", processFrame);
  }

  function onVideoStop() {
    videoElement.removeEventListener("timeupdate", processFrame);

    const canvasCtx = processingCanvas.getContext("2d");

    if (canvasCtx)
      canvasCtx.clearRect(
        0,
        0,
        processingCanvas.width,
        processingCanvas.height
      );
  }

  onMount(() => {
    // Create a hidden video element for loading and playback
    videoElement = document.createElement("video");
    videoElement.style.display = "none";
    // Ensure inline playback (especially for mobile)
    videoElement.setAttribute("playsinline", "true");
    document.body.appendChild(videoElement);

    // Create a hidden canvas element for processing
    processingCanvas = document.createElement("canvas");
    processingCanvas.width = canvasWidth;
    processingCanvas.height = canvasHeight;
    processingCanvas.style.display = "none";
    document.body.appendChild(processingCanvas);
    offscreenCtx = processingCanvas.getContext("2d");

    // Initialize MediaPipe FaceMesh
    faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.43,
      minTrackingConfidence: 0.5,
    });

    // Process results – drawing to the offscreen canvas (not displayed)
    faceMesh.onResults((results) => {
      if (!offscreenCtx) return;
      offscreenCtx.save();
      offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      offscreenCtx.drawImage(results.image, 0, 0, canvasWidth, canvasHeight);
      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          // Draw iris centers
          const irisCenterLandmarks = getLandmarks(landmarks, [
            LEFT_IRIS_CENTER,
            RIGHT_IRIS_CENTER,
          ]);
          drawLandmarks(offscreenCtx, irisCenterLandmarks, {
            color: "#FF0000",
            lineWidth: 1,
          });
          // Draw eye corners
          const eyeCornerLandmarks = getLandmarks(landmarks, [
            LEFT_EYE_CORNER,
            RIGHT_EYE_CORNER,
          ]);
          drawLandmarks(offscreenCtx, eyeCornerLandmarks, {
            color: "#FF0000",
            lineWidth: 1,
          });
          // Draw the nose tip
          const noseLandmarks = getLandmarks(landmarks, [NOSE_TIP]);
          drawLandmarks(offscreenCtx, noseLandmarks, {
            color: "#FF0000",
            lineWidth: 1,
          });

          // Log normalized iris position
          const { normX, normY, timestamp } = getNormalizedIrisPosition(
            landmarks,
            canvasWidth,
            canvasHeight
          );
          console.log(
            `Normalized Iris Position: X: ${normX}, Y: ${normY}, Timestamp: ${timestamp}`
          );
        }
      }
      offscreenCtx.restore();
    });

    // === Pre-warm mediapipe: perform a dummy send on a blank frame ===
    if (offscreenCtx) {
      // Draw a blank frame (or any minimal dummy content)
      offscreenCtx.fillStyle = "#000";
      offscreenCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      // Send the blank frame. This call will download and compile WASM, create a WebGL context, etc.
      faceMesh
        .send({ image: processingCanvas })
        .catch((error) => console.error("Error during warm-up:", error));
    }
  });

  onDestroy(() => {
    if (videoElement) {
      videoElement.pause();
      videoElement.src = "";
      videoElement.remove();
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  // Process the video frame by frame:
  async function processVideoFrame() {
    // Check immediately: if paused or ended, stop processing.
    if (videoElement.paused || videoElement.ended) {
      isProcessing = false;
      return;
    }
    if (offscreenCtx) {
      offscreenCtx.drawImage(videoElement, 0, 0, canvasWidth, canvasHeight);
    }
    // Check again before processing the frame.
    if (videoElement.paused || videoElement.ended) {
      isProcessing = false;
      return;
    }
    try {
      await faceMesh.send({ image: processingCanvas });
    } catch (error) {
      console.error("Error processing frame:", error);
    }
    // If video got paused while processing, stop here.
    if (videoElement.paused || videoElement.ended) {
      isProcessing = false;
      return;
    }
    animationFrameId = requestAnimationFrame(processVideoFrame);
  }

  // Triggered when a file is selected.
  function handleVideoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;
    if (file) {
      const url = URL.createObjectURL(file);
      videoElement.src = url;
      videoElement.onloadeddata = () => {
        videoLoaded = true;
        isPlaying = true;
        isProcessing = true;
        videoElement.play();
        processVideoFrame();
      };
    }
  }

  // Control handlers
  function handlePlay() {
    if (videoLoaded && videoElement.paused) {
      isPlaying = true;
      isProcessing = true;
      videoElement.play();
      processVideoFrame();
    }
  }

  function handlePause() {
    if (videoLoaded && !videoElement.paused) {
      isPlaying = false;
      // Immediately stop processing and cancel the next frame.
      isProcessing = false;
      videoElement.pause();
      cancelAnimationFrame(animationFrameId);
    }
  }

  function handleStop() {
    if (videoLoaded) {
      isPlaying = false;
      videoLoaded = false;
      videoElement.pause();
      videoElement.currentTime = 0;
      if (offscreenCtx) {
        offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      }
    }
  }
</script>

<div
  class="flex flex-col items-center justify-center rounded-lg border-4 border-primary opacity-90 shadow-glow bg-base-200 m-4 p-4"
>
  <!-- Processing indicator: Spinner while processing, Pause symbol when paused -->
  {#if isProcessing}
    <div class="spinner mt-4 flex justify-center">
      <div class="loader"></div>
    </div>
  {:else if videoLoaded && !isPlaying}
    <div class="pause-icon mt-4 flex justify-center">
      <div class="pause-symbol">&#10074;&#10074;</div>
    </div>
  {/if}
  <!-- Visible file input with original styling -->
  <input
    type="file"
    accept="video/*"
    on:change={handleVideoUpload}
    id="fileInput"
    class="flex p-2 bg-secondary hover:text-secondary-content rounded-md w-fit my-2 shadow-glow hover:scale-105 transition-transform"
  />

  <!-- When a video is loaded, display the controls -->
  {#if videoLoaded}
    <div
      class="flex w-full font-semibold text-lg border-2 border-neutral-content rounded-lg mb-4"
    >
      <button
        on:click={handlePlay}
        aria-label="Play video"
        disabled={isPlaying}
        class="bg-info m-2 ml-3 my-2 py-4 rounded-md w-full h-full text-info-content hover:bg-success hover:text-success-content hover:scale-105 hover:shadow-glow transition-transform"
        class:opacity-50={isPlaying}
        class:cursor-not-allowed={isPlaying}
      >
        Play
      </button>
      <button
        on:click={handlePause}
        aria-label="Pause video"
        disabled={!isPlaying}
        class="bg-secondary m-2 py-4 rounded-md w-full h-full text-secondary-content hover:bg-warning hover:text-warning-content hover:scale-105 hover:shadow-glow transition-transform"
        class:opacity-50={!isPlaying}
        class:cursor-not-allowed={!isPlaying}
      >
        Pause
      </button>
      <button
        on:click={handleStop}
        disabled={isPlaying}
        class="bg-accent m-2 mr-3 py-4 rounded-md w-full h-full text-accent-content hover:bg-error hover:text-error-content hover:scale-105 hover:shadow-glow-magenta transition-transform"
        class:opacity-50={isPlaying}
        class:cursor-not-allowed={isPlaying}
      >
        Stop
      </button>
    </div>
  {/if}
</div>

<style>
  /* Spinner styling */
  .loader {
    border: 8px solid #f3f3f3;
    border-top: 8px solid #555;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Pause symbol styling */
  .pause-symbol {
    font-size: 40px;
    font-weight: bold;
    color: #555;
  }
</style>
