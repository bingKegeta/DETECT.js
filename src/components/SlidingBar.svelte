<script lang="ts">
	import { onMount } from 'svelte';
	let sensitivity = 1.0;
	
	async function updateSensitivity() {
		const serverAddress = 'http://localhost:8080';
		console.log(serverAddress);
		try {
			const response = await fetch(`${serverAddress}/updateSensitivity`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sensitivity }),
			});
			if (!response.ok) throw new Error("Failed to update sensitivity");
		} catch (error) {
			console.error("Error updating sensitivity:", error);
		}
	}
	
	onMount(() => {
		const slider = document.getElementById("sensitivity-slider") as HTMLInputElement;
		if (slider) {
			slider.addEventListener("input", (event) => {
				const target = event.target as HTMLInputElement;
				sensitivity = parseFloat(target.value);
				updateSensitivity();
			});
		}
	});
	</script>
	
	<div class="relative w-full ml-4">
		<input
			type="range"
			class="w-full appearance-none h-2 bg-gray-300 rounded-lg slider-thumb"
			min="0.75"
			max="1.25"
			step="0.01"
			bind:value={sensitivity}
			id="sensitivity-slider"
		/>
		<div class="flex justify-between text-xs text-gray-400 mt-1">
			<span>0.75</span>
			<span class="text-white font-bold">{sensitivity.toFixed(2)}</span>
			<span>1.25</span>
		</div>
	</div>