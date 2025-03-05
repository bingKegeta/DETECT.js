<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount, onDestroy } from "svelte";
  import { writable } from 'svelte/store';
  import { 
    createSession,
    sessionId
   } from "../scripts/session";

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

  import { ProbabilityGraph } from "../scripts/graph";
  import { 
    WebSocketConnection,
    analysisData
   } from "../scripts/websocket";

  import { insertAnalysisData } from "../scripts/insert";

  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let graphCanvasEl: HTMLCanvasElement;

  let camera: Camera | null = null;
  let faceMesh: FaceMesh | null = null;
  let ws: WebSocketConnection | null = null;

  const WEBSOCKET_URL = "ws://localhost:9090/ws";
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

  let currentSessionId: number | null;

  // Define the Analysis type
  type Analysis = {
    session_id: number;
    timestamp: number;
    x: number;
    y: number;
    prob: number;
  };

  // WebSocket message handler
  function handleWebSocketMessage(data: any) {
    if (data.variance !== undefined && data.acceleration !== undefined && data.probability !== undefined) {
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

    // Create session data if not created yet
    if (!sessionCreated) {
      const sessionData = {
        name: sessionName || "Session", // Default session name if none provided
        start_time: startTime,
        end_time: new Date().toISOString(),
        var_min: variance ?? 0,
        var_max: variance ?? 0,
        acc_min: acceleration ?? 0,
        acc_max: acceleration ?? 0
      };

      createSession(sessionData);
      sessionCreated = true;
      
      const currentSessionId = get(sessionId);

      // Check if the current sessionId is valid
      if (currentSessionId === null) {
        console.error("Session ID is null!");
        return;
      }

      // Update analysisData store
      analysisData.update((data) => {
        return data.map(item => ({
          ...item, // Retain other fields
          session_id: currentSessionId // Use the current sessionId
        }));
      });
      
      console.log("analysisData:", get(analysisData));

      insertAnalysisData($analysisData);

    }

    //window.location.href = "/dashboard";
  }

  // Handle FaceMesh results
  onMount(() => {
    ws = new WebSocketConnection(WEBSOCKET_URL, handleWebSocketMessage);
    ws.start();

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

    faceMesh.onResults((results: Results) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasEl.width,
        canvasEl.height
      );

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

          const { normX, normY, timestamp } = getNormalizedIrisPosition(
            landmarks,
            canvasEl.width,
            canvasEl.height
          );

          const timestampInSeconds = timestamp / 1000;

          const metrics = {
            x: normX,
            y: normY,
            time: timestampInSeconds,
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

    if (graphCanvasEl) {
      probabilityGraph = new ProbabilityGraph(graphCanvasEl);
    }
  });

  // Cleanup on destroy
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
<div class="bg-base-200 m-4 overflow-hidden flex flex-col items-center justify-center border-primary rounded-lg border-4 opacity-90 shadow-glow h-[84svh] relative">
  <div class="border-2 border-accent rounded-lg relative">
    <video bind:this={videoEl} style="display: none;">
      <track kind="captions" />
    </video>
    <canvas
      bind:this={canvasEl}
      class="m-2 rounded bg-neutral shadow-glow"
      style="width: 75vw; height: 63vh;"
    ></canvas>

    <canvas
      bind:this={graphCanvasEl}
      class="absolute bottom-4 right-4 border-2 border-accent rounded-lg"
      style="width: 600px; height: 400px; background: rgba(0, 0, 0, 0.5);"
    ></canvas>

  </div>

  <div class="flex w-full font-semibold text-lg text-primary-content">
    <button
      on:click={startCapture}
      class="bg-info m-2 ml-3 my-2 py-4 rounded-md w-full h-full text-info-content hover:bg-success hover:text-success-content hover:scale-105 hover:shadow-glow transition-transform"
    >
      Start
    </button>
    <button
      on:click={stopCapture}
      class="bg-accent m-2 mr-3 my-2 py-4 rounded-md w-full h-full text-accent-content hover:bg-error hover:text-error-content hover:scale-105 hover:shadow-glow-magenta transition-transform"
      disabled={!$canStop}
    >
      Stop
    </button>
  </div>

  <!-- Modal to ask for session name -->
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
        on:click={closeModal}
        class="bg-gray-300 text-primary-content p-2 rounded-md hover:bg-gray-400 transition-colors"
      >
        Cancel
      </button>
      <button
        on:click={onSubmitSessionName}
        class="bg-info text-info-content p-2 rounded-md hover:bg-success transition-colors"
      >
        Submit
      </button>
    </div>
  </div>
</div>
{/if}
</div>