<<<<<<< HEAD
<script>
	import { writable } from "svelte/store";
  
	const serverAddress = "http://localhost:8080";
	let minMax = writable(false);
  
	// Function to update minMax state
	async function updateMinMax(value) {
	  try {
		const response = await fetch(`${serverAddress}/updateMinMaxSetting`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ value }),
		  credentials: "include",
		});
  
		if (!response.ok) throw new Error("Failed to update minMax");
  
		minMax.set(value);
	  } catch (error) {
		console.error("Error updating minMax:", error);
	  }
	}
  </script>
  
  <label class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md">
	Min/Max
	<input
	  type="checkbox"
	  class="toggle-switch"
	  bind:checked={$minMax}
	  on:change={(e) => updateMinMax(e.target.checked)}
	/>
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
=======
<script>
	import { writable } from "svelte/store";
  
	const serverAddress = "http://localhost:8080";
	let minMax = writable(false);
  
	// Function to update minMax state
	async function updateMinMax(value) {
	  try {
		const response = await fetch(`${serverAddress}/updateMinMaxSetting`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ value }),
		  credentials: "include",
		});
  
		if (!response.ok) throw new Error("Failed to update minMax");
  
		minMax.set(value);
	  } catch (error) {
		console.error("Error updating minMax:", error);
	  }
	}
  </script>
  
  <label class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md">
	Min/Max
	<input
	  type="checkbox"
	  class="toggle-switch"
	  bind:checked={$minMax}
	  on:change={(e) => updateMinMax(e.target.checked)}
	/>
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
>>>>>>> 3b43d016b4aeabb140164bbbc09def8d2b377310
  