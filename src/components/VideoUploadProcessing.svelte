<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import { FaceMesh } from "@mediapipe/face_mesh";
  import { drawLandmarks } from "@mediapipe/drawing_utils";
  import { createSession } from "../scripts/session";

  import {
    LEFT_IRIS_CENTER,
    RIGHT_IRIS_CENTER,
    LEFT_EYE_CORNER,
    RIGHT_EYE_CORNER,
    NOSE_TIP,
    getNormalizedIrisPosition,
    getLandmarks,
  } from "../scripts/utils";
  import { WebSocketConnection } from "../scripts/websocket";
  import { ProbabilityGraph } from "../scripts/graph";  // Import the ProbabilityGraph class

  // UI state variables
  let isPlaying = false;
  let videoLoaded = false;
  let isProcessing = false;

  // Spinner for file loading
  let isLoadingFile = false;

  let videoElement: HTMLVideoElement;
  let processingCanvas: HTMLCanvasElement;
  let offscreenCtx: CanvasRenderingContext2D | null;
  let faceMesh: FaceMesh;
  let animationFrameId: number;

  const canvasWidth = 640;
  const canvasHeight = 480;

  const WEBSOCKET_URL = import.meta.env.PUBLIC_WS_PORT;

  let variance: number | null = null;
  let acceleration: number | null = null;
  let probability: number | null = null;

  let ws: WebSocketConnection | null = null;
  let probabilityGraph: ProbabilityGraph;  // Declare a ProbabilityGraph instance

  let isModalVisible = writable(false);
  let sessionName = "";
  let sessionCreated = false;
  let startTime = new Date().toISOString();

  // WebSocket handler
  function handleWebSocketMessage(data: any) {
    if (data.variance !== undefined && data.acceleration !== undefined && data.probability !== undefined) {
      probability = data.probability;
      console.log("Probability:", probability);
// Update the probability graph with the new probability value
      if (probability !== null) {
        probabilityGraph.updateProbability(probability);
      }
    }
  }

  // Start/Restart WebSocket
  function startWebSocket() {
    if (ws) ws.close();
    ws = new WebSocketConnection(WEBSOCKET_URL, handleWebSocketMessage);
    ws.start();
  }

  // Send frames to FaceMesh
  function processFrame() {
    if (faceMesh && videoElement) {
      faceMesh.send({ image: videoElement });
    }
  }

  onMount(() => {
    // Probability graph canvas
    const graphCanvas = document.createElement("canvas");
    graphCanvas.width = canvasWidth;
    graphCanvas.height = 200;
    document.body.appendChild(graphCanvas);
    probabilityGraph = new ProbabilityGraph(graphCanvas);

    // Hidden <video> element
    videoElement = document.createElement("video");
    videoElement.style.display = "none";
    videoElement.setAttribute("playsinline", "true");
    document.body.appendChild(videoElement);

    // === IMPORTANT ===
    // This "ended" event closes the modal automatically when the video finishes playing.
    videoElement.addEventListener("ended", () => {
      // If no session created yet, we finalize it.
      if (!sessionCreated) {
        endSession();
      } else {
        // Otherwise, just close the modal if it's open
        isModalVisible.set(false);
      }
    });

    // Hidden processing canvas
    processingCanvas = document.createElement("canvas");
    processingCanvas.width = canvasWidth;
    processingCanvas.height = canvasHeight;
    processingCanvas.style.display = "none";
    document.body.appendChild(processingCanvas);
    offscreenCtx = processingCanvas.getContext("2d");

    // Initialize FaceMesh
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

    faceMesh.onResults((results) => {
      if (!offscreenCtx) return;
      offscreenCtx.save();
      offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      offscreenCtx.drawImage(results.image, 0, 0, canvasWidth, canvasHeight);

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          // Draw landmarks
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
          
          // Send metrics via WebSocket
          const metrics = {
            x: normX,
            y: normY,
            time: timestamp / 1000,
          };
          if (ws) {
            ws.sendMessage(metrics);
            console.log("WebSocket Sent:", metrics);
          }
        }
      }
      offscreenCtx.restore();
    });

 // === Pre-warm mediapipe: perform a dummy send on a blank frame ===
    if (offscreenCtx) {
      offscreenCtx.fillStyle = "#000";
      offscreenCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      // Send the blank frame. This call will download and compile WASM, create a WebGL context, etc.
      faceMesh
        .send({ image: processingCanvas })
        .catch((error) => console.error("Error during warm-up:", error));    }

    // Start WebSocket connection
    startWebSocket();
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
    if (ws) {
      ws.close();
    }
  });

  // Loop to process video frames
  async function processVideoFrame() {
    // Check immediately: if paused or ended, stop processing.
    if (videoElement.paused || videoElement.ended) {
      isProcessing = false;
      return;
    }
    if (offscreenCtx) {
      offscreenCtx.drawImage(videoElement, 0, 0, canvasWidth, canvasHeight);
    }
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
      // Show spinner for file loading
      isLoadingFile = true;

      const url = URL.createObjectURL(file);
      videoElement.src = url;

      // Once enough data is loaded to start playback
      videoElement.onloadeddata = () => {
        // Hide the spinner
        isLoadingFile = false;

        videoLoaded = true;
        isPlaying = true;
        isProcessing = true;
        videoElement.play();
        processVideoFrame();
      };
    }
  }

  // Optional controls
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
    if (!sessionCreated) {
      isModalVisible.set(true);
    } else {
      endSession();
    }
  }

  // End session logic
  function endSession() {
    if (!sessionCreated) {
      const sessionData = {
        name: sessionName || "Session", // Default name if none provided
        start_time: startTime,
        end_time: new Date().toISOString(),
        var_min: variance ?? 0,
        var_max: variance ?? 0,
        acc_min: acceleration ?? 0,
        acc_max: acceleration ?? 0
      };
      createSession(sessionData);
      sessionCreated = false;
      // Close the modal if open
      isModalVisible.set(false);
    }
    if (videoLoaded) {
      isPlaying = false;
      videoLoaded = false;
      videoElement.pause();
      videoElement.currentTime = 0;
      offscreenCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    // Redirect
    window.location.href = "/dashboard";
  }
</script>

<!--
  1) Loading Spinner for when the file is being selected and loaded
     If you want it in a different place, move this {#if isLoadingFile} block
-->
{#if isLoadingFile}
  <div class="spinner mt-4 flex justify-center">
    <div class="loader"></div>
  </div>
{/if}

<div class="flex flex-col items-center justify-center rounded-lg border-4 border-primary opacity-90 shadow-glow bg-base-200 m-4 p-4">
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
    disabled={isLoadingFile}
  />

  {#if videoLoaded}
    <div class="flex w-full font-semibold">
      <!-- Example: your Play, Pause, Stop buttons -->
      <!--
      <button on:click={handlePlay}>Play</button>
      <button on:click={handlePause}>Pause</button>
      <button on:click={handleStop}>Stop</button>
      -->
    </div>
  {/if}

  <!-- Session Name Modal -->
  {#if $isModalVisible}
    <div class="fixed inset-0 bg-base-200 bg-opacity-75 flex justify-center items-center z-10">
      <div class="bg-base-100 p-6 rounded-lg border-2 border-accent shadow-glow w-96">
        <h2 class="font-semibold text-xl text-primary-content mb-4">Enter Session Name</h2>
        <input
          type="text"
          bind:value={sessionName}
          class="border-2 border-accent p-2 rounded-md w-full mb-4 bg-base-200 text-primary-content"
          placeholder="Session Name"
        />
        <div class="flex justify-between">
          <button
            on:click={() => isModalVisible.set(false)}
            class="bg-gray-300 text-primary-content p-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            on:click={endSession}
            class="bg-info text-info-content p-2 rounded-md hover:bg-success transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Basic spinner styling */
  .spinner {
    margin: 1rem auto;
  }
  .loader {
    border: 8px solid rgba(0, 0, 0, 0.1);
    border-top: 8px solid #3498db; /* or your color choice */
    border-radius: 50%;
    width: 48px;
    height: 48px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  /* Optional pause symbol styling */
  .pause-symbol {
    font-size: 2rem;
    color: #fff;
  }
</style>
