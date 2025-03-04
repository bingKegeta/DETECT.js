<script>
	import { onMount } from "svelte";
	import { writable } from "svelte/store";
  
	const serverAddress = 'http://localhost:8080';
  
	// Create a writable store for graphing state
	let graphing = writable(false);
  
	// Function to fetch initial graphing state
	async function fetchGraphingState() {
	  try {
		const response = await fetch(`${serverAddress}/getGraphing`);
		if (response.ok) {
		  const data = await response.json();
		  graphing.set(data.graphing);
		}
	  } catch (error) {
		console.error("Error fetching graphing state:", error);
	  }
	}
  
	// Function to update graphing state
	async function updateGraphing(value) {
	  try {
		const response = await fetch(`${serverAddress}/updateGraphing`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ graphing: value }),
		});
  
		if (!response.ok) throw new Error("Failed to update graphing");
  
		const data = await response.json();
		graphing.set(data.graphing);
	  } catch (error) {
		console.error("Error updating graphing:", error);
	  }
	}
  
	// Fetch state on component mount
	onMount(fetchGraphingState);
  </script>
  
  <label class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md">
	Graphing
	<input
	  type="checkbox"
	  class="toggle-switch"
	  bind:checked={$graphing}
	  on:change={() => updateGraphing($graphing)}
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
  