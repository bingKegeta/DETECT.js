<script>
  import { onMount } from "svelte";
  import { writable } from "svelte/store";

  const serverAddress = import.meta.env.PUBLIC_SERVER_ADDRESS;

  let userSettings = writable({
    affine: false,
    min_max: false,
    plotting: false,
    sensitivity: 1.0,
  });

  let isLoading = writable(true); // Prevents UI from showing before data is ready

  async function fetchUserSettings() {
    try {
      const response = await fetch(`${serverAddress}/getUserSettings`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        userSettings.update(settings => {
          settings.affine = data.affine;
          settings.min_max = data.min_max;
          settings.plotting = data.plotting;
          settings.sensitivity = data.sensitivity;
          return settings;
        });
      } else {
        console.error("Failed to fetch user settings:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
    } finally {
      isLoading.set(false); // Data is ready, allow UI to load
    }
  }

  async function updateNormalization(value) {
    try {
      const response = await fetch(`${serverAddress}/updateNormalization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normalization: value }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update normalization");

      userSettings.update(settings => {
        settings.affine = value;
        return settings;
      });

    } catch (error) {
      console.error("Error updating normalization:", error);
    }
  }

  async function updateGraphing(value) {
    try {
      const response = await fetch(`${serverAddress}/updateGraphing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plotting: value }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to update plotting");

      userSettings.update(settings => {
        settings.plotting = value;
        return settings;
      });
    } catch (error) {
      console.error("Error updating plotting:", error);
    }
  }

  async function updateMinMax(value) {
    try {
      const response = await fetch(`${serverAddress}/updateMinMaxSetting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minMax: value }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to update minMax");

      userSettings.update(settings => {
        settings.min_max = value;
        return settings;
      });
    } catch (error) {
      console.error("Error updating minMax:", error);
    }
  }

  async function updateSensitivity(value) {
    const serverAddress = import.meta.env.PUBLIC_SERVER_ADDRESS;

    try {
      const response = await fetch(`${serverAddress}/updateSensitivity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensitivity: parseFloat(value) }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update sensitivity");

      userSettings.update(settings => {
        settings.sensitivity = value;
        return settings;
      });
    } catch (error) {
      console.error("Error updating sensitivity:", error);
    }
  }
  // Run API call once when component is mounted
  onMount(fetchUserSettings);
</script>
  
<!-- Tracking & Analysis Settings -->
<div class="flex flex-col gap-4 text-base-content">
  <label
    class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md"
  >
    Normalization
    <input
      type="checkbox"
      class="toggle-switch"
      bind:checked={$userSettings.affine}
      on:change={(e) => updateNormalization(e.target.checked)}
    />
  </label>
</div>

<div class="flex flex-col gap-4 text-base-content">
  <label
    class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md"
  >
    Min/Max
    <input
      type="checkbox"
      class="toggle-switch"
      bind:checked={$userSettings.min_max}
      on:change={(e) => updateMinMax(e.target.checked)}
    />
  </label>
</div>

<div class="flex flex-col gap-4 text-base-content">
  <label
    class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md"
  >
    Graphing
    <input
      type="checkbox"
      class="toggle-switch"
      bind:checked={$userSettings.plotting}
      on:change={(e) => updateGraphing(e.target.checked)}
    />
  </label>
</div>

<!-- Sensitivity Slider -->
<label class="flex items-center justify-between bg-base-400 p-4 rounded-lg shadow-md text-white">
  Sensitivity
  <div class="relative w-full ml-4">
    <input
      type="range"
      class="w-full appearance-none h-2 bg-gray-300 rounded-lg slider-thumb"
      min="0.75"
      max="1.25"
      step="0.01"
      bind:value={$userSettings.sensitivity}
      on:input={(e) => updateSensitivity(e.target.value)}
      id="sensitivity-slider"
    />
    <div class="flex justify-between text-xs text-gray-400 mt-1">
      <span>0.75</span>
      <span class="text-white font-bold">{$userSettings.sensitivity}</span>
      <span>1.25</span>
    </div>
  </div>
</label>

<style>
  .toggle-switch {
    appearance: none;
    width: 50px;
    height: 26px;
    background-color: var(--color-primary);
    border-radius: 20px;
    position: relative;
    transition: background 0.3s ease-in-out;
    cursor: pointer;
    outline: none;
  }

  .toggle-switch::before {
    content: "";
    position: absolute;
    width: 22px;
    height: 22px;
    background-color: var(--color-base-100);
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.3s ease-in-out;
  }

  .toggle-switch:checked {
    background-color: var(--color-success);
  }

  .toggle-switch:checked::before {
    transform: translateX(24px);
  }
</style>
  
  