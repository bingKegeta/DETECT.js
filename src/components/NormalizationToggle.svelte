<script>
	import { writable } from "svelte/store";
  
	const serverAddress = "http://localhost:8080";
	let normalization = writable(false);
  
	// Function to update normalization state
	async function updateNormalization(value) {
	  try {
		const response = await fetch(`${serverAddress}/updateNormalization`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ value }),
		  credentials: "include",
		});
  
		if (!response.ok) throw new Error("Failed to update normalization");
  
		normalization.set(value);
	  } catch (error) {
		console.error("Error updating normalization:", error);
	  }
	}
  </script>
  
  <label class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md">
	Normalization
	<input
	  type="checkbox"
	  class="toggle-switch"
	  bind:checked={$normalization}
	  on:change={(e) => updateNormalization(e.target.checked)}
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
  