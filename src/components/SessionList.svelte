<script lang="ts">
  import { onMount } from "svelte";
  import type { SessionRequestData } from "../scripts/utils";

  let sessions: SessionRequestData[] = [];
  let error: string = "";
  let selectedSessionId: number | null = null;
  let showConfirmation: boolean = false;
  let sessionToDelete: number | null = null;

  // Function to store the clicked session ID and set it as selected
  function selectSession(id: number) {
    sessionStorage.setItem("clickedID", id.toString());
    window.dispatchEvent(new StorageEvent("storage", { key: "clickedID" }));
    selectedSessionId = id;
  }

  // Function to show deletion confirmation dialog
  function confirmDelete(id: number, event: MouseEvent) {
    event.stopPropagation(); // Prevent triggering the parent click
    sessionToDelete = id;
    showConfirmation = true;
  }

  // Function to handle session deletion
  async function deleteSession() {
    if (!sessionToDelete) return;

    try {
      const serverAddress = import.meta.env.PUBLIC_SERVER_ADDRESS;
      const response = await fetch(`${serverAddress}/deleteSession`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ session_id: sessionToDelete }),
      });

      if (!response.ok) throw new Error("Failed to delete session");

      // Remove the session from the list
      sessions = sessions.filter((s) => s.id !== sessionToDelete);

      // If the deleted session was selected, clear selection
      if (selectedSessionId === sessionToDelete) {
        selectedSessionId = null;
      }
    } catch (err) {
      error = "Failed to delete session.";
      console.error(err);
    } finally {
      // Reset delete state
      sessionToDelete = null;
      showConfirmation = false;
    }
  }

  // Function to cancel deletion
  function cancelDelete() {
    showConfirmation = false;
    sessionToDelete = null;
  }

  onMount(async () => {
    try {
      const serverAddress = import.meta.env.PUBLIC_SERVER_ADDRESS;
      const response = await fetch(`${serverAddress}/getSessions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch sessions");

      const rawJson = await response.json();
      let seenNames: Set<string> = new Set(); // Track names that have already appeared

      // Iterate over sessions and handle duplicates
      sessions = rawJson.map((session: any) => {
        let sessionName = session.Name;
        let originalName = sessionName;
        let counter = 1;

        // Check for duplicate names and append a counter
        while (seenNames.has(sessionName)) {
          sessionName = `${originalName} (${counter})`;
          counter++;
        }

        seenNames.add(sessionName); // Add the name to the set

        return {
          id: session.ID,
          userId: session.UserID,
          name: sessionName, // Updated name with potential counter
          startTime: new Date(session.StartTime).toLocaleString(),
          endTime: new Date(session.EndTime).toLocaleString(),
          varMin: session.VarMin,
          varMax: session.VarMax,
          accMin: session.AccMin,
          accMax: session.AccMax,
          createdAt: (() => {
            const date = new Date(session.CreatedAt);
            const diffMs = Date.now() - date.getTime();
            const hours = diffMs / (1000 * 60 * 60);
            if (hours < 24)
              return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            else if (hours < 72) return `${Math.floor(hours / 24)}d ago`;
            else
              return date.toLocaleDateString([], {
                month: "2-digit",
                day: "2-digit",
              });
          })(),
        };
      });
    } catch (err) {
      error = "Failed to fetch sessions.";
      console.error(err);
    }
  });
</script>

{#if error}
  <div class="text-error">{error}</div>
{:else if sessions.length > 0}
  <div class="flex flex-col gap-4">
    {#each sessions as session (session.id)}
      <div
        id={`Session-${session.id}`}
        class="relative session-item max-w-full w-full m-auto p-4 bg-base-200 rounded-lg shadow-lg border-2 border-secondary hover:border-accent hover:shadow-xl transition-all duration-300 mb-4 cursor-pointer {selectedSessionId ===
        session.id
          ? 'selected-session bg-gradient-to-r from-secondary to-accent border-primary shadow-xl'
          : ''}"
        on:click={() => selectSession(session.id)}
        tabindex="0"
        role="button"
        on:keydown={(e) => e.key === "Enter" && selectSession(session.id)}
      >
        <div class="flex justify-between items-center">
          <p class="text-base-content text-xl font-medium truncate">
            {session.name}
          </p>
          <p
            class="text-neutral-content text-sm p-1 bg-neutral ml-1 border-2 border-accent rounded-full {selectedSessionId ===
            session.id
              ? 'bg-primary text-primary-content border-secondary'
              : ''} transition-all duration-300"
          >
            {session.createdAt}
          </p>
        </div>

        {#if selectedSessionId === session.id}
          <div class="absolute -right-2 -top-2 flex">
            <button
              class="delete-btn p-2 bg-error text-error-content rounded-full shadow-md hover:bg-error-dark transition-all duration-200 animate-fade-in"
              on:click={(e) => confirmDelete(session.id, e)}
              title="Delete session"
              aria-label="Delete session"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m6.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{:else}
  <div>No sessions available.</div>
{/if}

{#if showConfirmation}
  <div
    class="modal-backdrop"
    on:click={cancelDelete}
    aria-labelledby="backdrop"
    aria-hidden="true"
  >
    <div
      class="bg-neutral rounded-lg border-2 border-primary p-6 max-w-xl w-[90%] shadow-lg animate-fade-in"
      on:click|stopPropagation
      aria-modal="true"
      aria-hidden="true"
    >
      <h3 class="text-2xl text-error text-center font-bold mb-4">
        Delete Session
      </h3>
      <p class="mb-4">
        Are you sure you want to <span class="text-error font-bold">delete</span
        >
        this session?
        <br />
        <strong class="text-error underline text-lg"
          >This action cannot be undone.</strong
        >
      </p>
      <div class="flex justify-end gap-2">
        <button
          class="border border-secondary bg-base-200 rounded-xl mx-4 p-4 hover:border-success hover:bg-base-100 transition-all duration-200"
          on:click={cancelDelete}>Cancel</button
        >
        <button
          class="border border-secondary bg-base-100 rounded-xl p-4 hover:border-error hover:bg-error transition-all duration-200"
          on:click={deleteSession}>Delete</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .hover\:bg-error-dark:hover {
    background-color: color-mix(in srgb, var(--color-error) 85%, black);
  }

  .selected-session {
    transform: translateY(-2px);
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
  }
</style>
