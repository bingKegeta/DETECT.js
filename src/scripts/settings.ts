// src/settings.ts
import { writable } from 'svelte/store';

const serverAddress = import.meta.env.PUBLIC_SERVER_ADDRESS;

// The store for user settings
export const userSettings = writable({
  affine: false,
  min_max: false,
  plotting: false,
  sensitivity: 1.0,
});

// Store for tracking the loading state
export const isLoading = writable(true);

// Fetch user settings from the server
export async function fetchUserSettings() {
  try {
    const userId = sessionStorage.getItem("userId");
      if (!userId) {
        console.error("User ID not found in session storage.");
        return;
      }
      const response = await fetch(`${serverAddress}/getUserSettings?user_id=${userId}`, {
        method: "GET",
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
    isLoading.set(false);
  }
}
