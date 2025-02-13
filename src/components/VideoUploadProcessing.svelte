<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { FaceMesh, type Results } from "@mediapipe/face_mesh";
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
  
    let video: HTMLVideoElement;
    let canvas: HTMLCanvasElement;
    let faceMesh: FaceMesh | null = null;
  
    let isPlaying = false;
    let videoLoaded = false;
    let key = 0;
  
    // Initialize FaceMesh whenever key changes.
    $: {
      key;
      if (canvas) {
        initFaceMesh();
      }
    }
  
    function initFaceMesh() {
      if (!canvas) return;
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) return;
  
      faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
  
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.43,
        minTrackingConfidence: 0.5,
      });
  
      faceMesh.onResults((results: Results) => {
        if (!canvasCtx) return;
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw the image using the canvas's internal resolution.
        canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            const irisCenterLandmarks = getLandmarks(landmarks, [
              LEFT_IRIS_CENTER,
              RIGHT_IRIS_CENTER,
            ]);
            drawLandmarks(canvasCtx, irisCenterLandmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });
            const eyeCornerLandmarks = getLandmarks(landmarks, [
              LEFT_EYE_CORNER,
              RIGHT_EYE_CORNER,
            ]);
            drawLandmarks(canvasCtx, eyeCornerLandmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });
            const noseLandmarks = getLandmarks(landmarks, [NOSE_TIP]);
            drawLandmarks(canvasCtx, noseLandmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });
  
            const { normX, normY, timestamp } = getNormalizedIrisPosition(
              landmarks,
              canvas.width,
              canvas.height
            );
            console.log(
              `Normalized Iris Position: X: ${normX}, Y: ${normY}, Timestamp: ${timestamp}`
            );
          }
        }
        canvasCtx.restore();
      });
    }
  
    async function processVideo() {
      if (video && canvas && faceMesh) {
        async function onVideoFrame() {
          if (video.paused || video.ended) return;
          if (faceMesh) {
            await faceMesh.send({ image: video });
          }
          requestAnimationFrame(onVideoFrame);
        }
        requestAnimationFrame(onVideoFrame);
      }
    }
  
    function handleVideoUpload(event: Event) {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file && video) {
        video.src = URL.createObjectURL(file);
        video.onloadeddata = () => {
          videoLoaded = true;
          isPlaying = true;
          video.play();
          processVideo();
        };
      }
    }
  
    function handlePlay() {
      if (video) {
        isPlaying = true;
        video.play();
        processVideo();
      }
    }
  
    function handlePause() {
      if (video) {
        isPlaying = false;
        video.pause();
      }
    }
  
    function handleStop() {
      isPlaying = false;
      videoLoaded = false;
      key = key + 1;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  
    onMount(() => {
      // Set the internal resolution to match the displayed size.
      if (canvas) {
        // Removing "px" when setting the canvas width/height attributes.
        canvas.width = Math.floor(window.innerWidth * 0.9);
        canvas.height = Math.floor(window.innerHeight * 0.9);
      }
    });
  
    onDestroy(() => {
      if (faceMesh) {
        faceMesh.close();
      }
    });
  </script>

  <div class="bg-base-200 m-4 overflow-hidden flex flex-col items-center justify-center border-primary rounded-lg border-4 opacity-90 shadow-glow h-[84svh]">
    <!-- Video file input -->
    <input
      type="file"
      accept="video/*"
      on:change={handleVideoUpload}
      class="flex p-2 bg-secondary text-secondary-content rounded-md w-fit mb-2 shadow-glow hover:scale-105 transition-transform"
    />
  
    <div class="border-2 border-accent rounded-lg">
      {#key key}
        <video bind:this={video} style="display: none;">
          <track kind="captions" />
        </video>
      {/key}
      <!-- The canvas is styled to use viewport units.
           It will always be 75vw by 75vh, following the browser window’s aspect ratio. -->
      <canvas
        bind:this={canvas}
        class="m-2 rounded bg-neutral shadow-glow"
        style="width: 75vw; height: 63vh;"
      ></canvas>
    </div>
  
    {#if videoLoaded}
      <div class="flex w-full font-semibold text-lg text-primary-content">
        <button
          on:click={handlePlay}
          disabled={isPlaying}
          class="bg-info m-2 ml-3 my-2 py-4 rounded-md w-full h-full text-info-content hover:bg-success hover:text-success-content hover:scale-105 hover:shadow-glow transition-transform"
          class:opacity-50={isPlaying}
          class:cursor-not-allowed={isPlaying}
        >
          Play
        </button>
        <button
          on:click={handlePause}
          disabled={!isPlaying}
          class="bg-warning m-2 py-4 rounded-md w-full h-full text-warning-content hover:bg-secondary hover:text-secondary-content hover:scale-105 hover:shadow-glow transition-transform"
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
  