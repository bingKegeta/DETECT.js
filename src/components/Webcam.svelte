<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";
  import { createSession } from "../scripts/session";
  import { fetchUserSettings, userSettings } from "../scripts/settings";

  import {
    applyAffineTransformation,
    calculateAffineTransformation,
  } from "../scripts/affineTransformation";

  import { Camera } from "@mediapipe/camera_utils";
  import { drawLandmarks } from "@mediapipe/drawing_utils";
  import { FaceMesh, type Results } from "@mediapipe/face_mesh";
  import type { Coordinates } from "../scripts/affineTransformation";
  import { applySmoothing } from "../scripts/smoothing";

  import {
    LEFT_EYE_CORNER,
    LEFT_IRIS_CENTER,
    NOSE_TIP,
    RIGHT_EYE_CORNER,
    RIGHT_IRIS_CENTER,
    getLandmarks,
    getNormalizedIrisPosition,
  } from "../scripts/utils";

  import { ProbabilityGraph } from "../scripts/graph";
  import { WebSocketConnection } from "../scripts/websocket";

  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let graphCanvasEl: HTMLCanvasElement;

  let camera: Camera | null = null;
  let faceMesh: FaceMesh | null = null;
  let ws: WebSocketConnection | null = null;

  const WEBSOCKET_URL = import.meta.env.PUBLIC_WS_PORT;
  let variance: number | null = null;
  let acceleration: number | null = null;
  let probability: number | null = null;
  let startTime = new Date().toISOString(); // Capture the start time

  let probabilityGraph: ProbabilityGraph | null = null;
  let sessionName: string = ""; // Default session name

  export const webcamState = writable(false); // Default state: off
  let sessionCreated = false;

  // Flag to handle modal visibility
  let isModalVisible = writable(false);

  // Flag to track whether webcam has started (for disabling Stop button initially)
  let canStop = writable(false);

  let initialNoseTip: Coordinates | null = null; // Track the initial nose tip position

  let previousXValues: number[] = [];
  let previousYValues: number[] = [];

  let sensitivity: number | null = null;

  export const shouldShowGraph = writable(false);

  let affineTransformEnabled = writable(false);

  // Log the settings whenever they change
  userSettings.subscribe((settings: any) => {
    console.log("User settings:", settings);
    sensitivity = settings.sensitivity;
    shouldShowGraph.set(settings.plotting ?? false);
    affineTransformEnabled.set(settings.affine ?? false);
  });

  $: {
    $shouldShowGraph;

    if (graphCanvasEl && $shouldShowGraph) {
      probabilityGraph = new ProbabilityGraph(graphCanvasEl);
    } else {
      probabilityGraph = null;
    }
  }

  // WebSocket message handler
  function handleWebSocketMessage(data: any) {
    if (
      data.variance !== undefined &&
      data.acceleration !== undefined &&
      data.probability !== undefined
    ) {
      probability = data.probability;
      console.log("Probability:", probability);

      if (probabilityGraph) {
        if (probability !== null) {
          probabilityGraph.updateProbability(probability);
        }
      }
    }
  }

  // Start webcam capture
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
      canStop.set(true); // Enable Stop button once webcam has started
    }
  }

  // Stop the webcam capture
  function stopCapture() {
    if (camera && canvasEl) {
      camera.stop();
      camera = null;
      const canvasCtx = canvasEl.getContext("2d");
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }
    }

    if (!sessionCreated) {
      isModalVisible.set(true); // Show the modal to input the session name
    } else {
      endSession();
    }
  }

  // Handle closing the modal
  function closeModal() {
    isModalVisible.set(false);
  }

  // Handle the form submit for the session name
  function onSubmitSessionName() {
    if (sessionName) {
      endSession(); // End the session and create session data
    }
  }

  // Finalize the session creation
  function endSession() {
    if (camera && canvasEl) {
      camera.stop();
      camera = null;
      const canvasCtx = canvasEl.getContext("2d");
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }
    }

    if (!sessionCreated) {
      const sessionData = {
        name: sessionName || "Session",
        start_time: startTime,
        end_time: new Date().toISOString(),
        var_min: variance ?? 0,
        var_max: variance ?? 0,
        acc_min: acceleration ?? 0,
        acc_max: acceleration ?? 0,
      };
      createSession(sessionData);
      sessionCreated = true;
    }
    window.location.href = "/dashboard";
    //console.log("here");
  }

  onMount(() => {
    // Fetch user settings on component mount
    fetchUserSettings();

    // Initialize WebSocket
    ws = new WebSocketConnection(WEBSOCKET_URL, handleWebSocketMessage);
    ws.start();

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

    // Draw face landmarks to canvas
    const canvasCtx = canvasEl.getContext("2d");
    if (!canvasCtx) return;

    // Inside the onResults function, after drawing landmarks:
    faceMesh.onResults((results: Results) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          const irisCenters = getLandmarks(landmarks, [
            LEFT_IRIS_CENTER,
            RIGHT_IRIS_CENTER,
          ]);
          drawLandmarks(canvasCtx, irisCenters, {
            color: "#FF0000",
            lineWidth: 2,
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

          // Smoothing iris positions
          const { normX, normY, timestamp } = getNormalizedIrisPosition(
            landmarks,
            canvasEl.width,
            canvasEl.height,
          );

          // Apply smoothing to the iris position
          const smoothedNormX = applySmoothing(normX, previousXValues);
          const smoothedNormY = applySmoothing(normY, previousYValues);

          // Track the current nose tip for affine transformation
          const currentNoseTip: Coordinates = getLandmarks(landmarks, [
            NOSE_TIP,
          ])[0];

          // Conditionally apply affine transformation
          if (initialNoseTip && $affineTransformEnabled) {
            // Calculate the affine transformation matrix based on initial and current nose tip positions
            const transformationMatrix = calculateAffineTransformation(
              initialNoseTip,
              currentNoseTip,
            );

            // Apply the transformation to all landmarks (using smoothed iris position)
            const transformedLandmarks = landmarks.map((landmark) =>
              applyAffineTransformation(landmark, transformationMatrix),
            );

            // Draw the transformed landmarks on the canvas
            drawLandmarks(canvasCtx, transformedLandmarks, {
              color: "#0000FF",
              lineWidth: 2,
            });
          }

          const timestampInSeconds = timestamp / 1000; // Convert timestamp to seconds

          const metrics = {
            x: smoothedNormX,
            y: smoothedNormY,
            time: timestampInSeconds,
            sensitivity: sensitivity ?? 1.0,
          };

          if (ws) {
            ws.sendMessage(metrics);
            console.log("WebSocket Sent:", metrics);
          }
        }
      }
      canvasCtx.restore();
    });
    if (canvasEl) {
      canvasEl.width = Math.floor(window.innerWidth * 0.9);
      canvasEl.height = Math.floor(window.innerHeight * 0.9);
    }
  });

  onDestroy(() => {
    if (faceMesh) {
      faceMesh.close();
    }
    if (camera) {
      camera.stop();
    }
    if (ws) {
      ws.close();
    }
  });
</script>

<!-- Outer container -->
<div
  class="bg-base-200 m-4 overflow-hidden flex flex-col items-center justify-center
         border-primary rounded-lg border-4 opacity-90 shadow-glow h-[84svh] relative"
>
  <!-- Row container for the webcam canvas (left) and graph canvas (right) -->
  <div class="flex flex-row w-full h-auto justify-center items-center">
    <!-- Left side: Webcam -->
    <div
      class="flex justify-center items-center p-4"
      style="width: {$shouldShowGraph ? '50%' : '100%'}"
    >
      <!-- Hidden video (used by FaceMesh) -->
      <video bind:this={videoEl} class="hidden">
        <track kind="captions" />
      </video>

      <!-- Webcam canvas -->
      <canvas
        bind:this={canvasEl}
        class="rounded bg-neutral shadow-glow w-full h-[60vh]"
      ></canvas>
    </div>

    <!-- Right side: Graph (conditionally rendered) -->
    {#if $shouldShowGraph}
      <div class="w-1/2 flex justify-center items-center p-4">
        <canvas
          bind:this={graphCanvasEl}
          class="border-2 border-accent rounded-lg bg-black/50 w-full h-[60vh]"
        ></canvas>
      </div>
    {/if}
  </div>

  <!-- Control buttons at the bottom -->
  <div class="flex w-full font-semibold text-lg text-primary-content">
    <button
      on:click={startCapture}
      class="bg-info m-2 ml-3 my-2 py-4 rounded-md w-full text-info-content
             hover:bg-success hover:text-success-content hover:scale-105
             hover:shadow-glow transition-transform"
    >
      Start
    </button>
    <button
      on:click={stopCapture}
      class="bg-accent m-2 mr-3 my-2 py-4 rounded-md w-full text-accent-content
             hover:bg-error hover:text-error-content hover:scale-105
             hover:shadow-glow-magenta transition-transform"
      disabled={!$canStop}
    >
      Stop
    </button>
  </div>

  <!-- Modal for session name -->
  {#if $isModalVisible}
  <div
    class="fixed inset-0 flex justify-center items-center z-50"
    style="background-color: black !important;"  
  >
    <div
      class="p-6 rounded-lg border-4 border-secondary shadow-glow w-96"
      style="background-color: #000000;" 
    >
      <h2
        class="font-mono font-semibold text-center text-2xl text-primary mb-4"
      >
        Save Session?
      </h2>

      <input
        type="text"
        bind:value={sessionName}
        class="border border-accent p-2 rounded-md w-full mb-4
               bg-base-200 text-base-content focus:border-info focus:bg-neutral focus:outline-none ease-in-out duration-150"
        placeholder="Session Name"
      />

      <div class="flex justify-between">
        <button
          on:click={closeModal}
          class="bg-neutral border border-warning hover:border-error hover:bg-error p-2 rounded-lg transition-colors duration-150 hover:text-error-content"
        >
          Cancel
        </button>
        <button
          on:click={onSubmitSessionName}
          class="bg-neutral border border-info hover:border-success hover:bg-success p-2 rounded-lg transition-colors duration-150 hover:text-success-content"
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}
</div>
