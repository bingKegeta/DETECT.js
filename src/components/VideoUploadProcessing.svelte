<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { FaceMesh } from "@mediapipe/face_mesh";
  import { drawLandmarks } from "@mediapipe/drawing_utils";
  import { writable } from "svelte/store";
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

  // Offscreen processing variables
  let videoElement: HTMLVideoElement;
  let processingCanvas: HTMLCanvasElement;
  let offscreenCtx: CanvasRenderingContext2D | null;
  let faceMesh: FaceMesh;
  let animationFrameId: number;

  const canvasWidth = 640;
  const canvasHeight = 480;

  const WEBSOCKET_URL = import.meta.env.WEBSOCKET_SERVER_ADDRESS;

  let variance: number | null = null;
  let acceleration: number | null = null;
  let probability: number | null = null;

  let ws: WebSocketConnection | null = null;
  let probabilityGraph: ProbabilityGraph;  // Declare a ProbabilityGraph instance

  let isModalVisible = writable(false);
  let sessionName = "";
  let sessionCreated = false;
  let startTime = new Date().toISOString();

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

  function startWebSocket() {
    if (ws) ws.close(); // Ensure no duplicate connections

    ws = new WebSocketConnection(WEBSOCKET_URL, handleWebSocketMessage);
    ws.start();
  }

  function processFrame() {
    if (faceMesh && videoElement) {
      faceMesh.send({ image: videoElement });
    }
  }

  onMount(() => {
    // Initialize the probability graph
    const graphCanvas = document.createElement("canvas");
    graphCanvas.width = canvasWidth;
    graphCanvas.height = 200; // Set a fixed height for the graph
    document.body.appendChild(graphCanvas);
    probabilityGraph = new ProbabilityGraph(graphCanvas);

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
      // Draw a blank frame (or any minimal dummy content)
      offscreenCtx.fillStyle = "#000";
      offscreenCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      // Send the blank frame. This call will download and compile WASM, create a WebGL context, etc.
      faceMesh
        .send({ image: processingCanvas })
        .catch((error) => console.error("Error during warm-up:", error));
    }

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
  if (!sessionCreated) {
    isModalVisible.set(true);
  } else {
    endSession();
  }
}

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
    isModalVisible.set(false);
  }
  if (videoLoaded) {
    isPlaying = false;
    videoLoaded = false;
    videoElement.pause();
    videoElement.currentTime = 0;
    if (offscreenCtx) {
      offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
  }
  window.location.href = "/dashboard";
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
        aria-label="Stop video"
        class="bg-error m-2 mr-3 py-4 rounded-md w-full h-full text-error-content hover:bg-warning hover:text-warning-content hover:scale-105 hover:shadow-glow transition-transform"
      >
        Stop
      </button>
    </div>
  {/if}

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
