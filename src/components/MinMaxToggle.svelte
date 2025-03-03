<script>
	import { onMount } from "svelte";
	import { writable } from "svelte/store";

	const serverAddress = "http://localhost:8080";

	// Create a writable store for min/max state
	let minMax = writable(false);

	// Function to fetch initial min/max state
	async function fetchMinMaxState() {
		try {
			const response = await fetch(`${serverAddress}/getMinMaxVar`);
			if (response.ok) {
				const data = await response.json();
				minMax.set(data.minMax);
			}
		} catch (error) {
			console.error("Error fetching min/max state:", error);
		}
	}

	// Function to update min/max state
	async function updateMinMax(value) {
		try {
			const response = await fetch(`${serverAddress}/updateMinMaxVar`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ minMax: value }),
			});

			if (!response.ok) throw new Error("Failed to update min/max");

			const data = await response.json();
			minMax.set(data.minMax);
		} catch (error) {
			console.error("Error updating min/max:", error);
		}
	}

	// Fetch state on component mount
	onMount(fetchMinMaxState);
</script>

<label class="flex items-center justify-between bg-base-200 p-4 rounded-lg shadow-md text-base-content">
	Min/Max Toggle
	<input
		type="checkbox"
		class="toggle-switch"
		bind:checked={$minMax}
		on:change={() => updateMinMax($minMax)}
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
