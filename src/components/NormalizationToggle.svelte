<script>
	import { onMount } from "svelte";
	import { writable } from "svelte/store";
  
	const serverAddress = 'http://localhost:8080';
  
	// Create a writable store for normalization state
	let normalization = writable(false);
  
	// Function to fetch initial normalization state
	async function fetchNormalizationState() {
	  try {
		const response = await fetch(`${serverAddress}/getNormalization`);
		if (response.ok) {
		  const data = await response.json();
		  normalization.set(data.normalization);
		}
	  } catch (error) {
		console.error("Error fetching normalization state:", error);
	  }
	}
  
	// Function to update normalization state
	async function updateNormalization(value) {
	  try {
		const response = await fetch(`${serverAddress}/updateNormalization`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ normalization: value }),
		});
  
		if (!response.ok) throw new Error("Failed to update normalization");
  
		const data = await response.json();
		normalization.set(data.normalization);
	  } catch (error) {
		console.error("Error updating normalization:", error);
	  }
	}
  
	// Fetch state on component mount
	onMount(fetchNormalizationState);
  </script>
  
  <label class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md">
	Normalization
	<input
	  type="checkbox"
	  class="toggle-switch"
	  bind:checked={$normalization}
	  on:change={() => updateNormalization($normalization)}
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
  