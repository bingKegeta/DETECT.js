<script lang="ts">
  import { onMount } from "svelte";
  import type { SessionRequestData } from "../scripts/utils";

  let sessions: SessionRequestData[] = [];
  let error: string = "";

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
      sessions = rawJson.map((session: any) => ({
        id: session.ID,
        userId: session.UserID,
        name: session.Name,
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
      }));
      console.log("sessions", sessions);
    } catch (err) {
      error = "Failed to fetch sessions.";
      console.error(err);
    }
  });
</script>

{#if error}
  <div class="error">{error}</div>
{:else if sessions.length > 0}
  <div class="session-list">
    {#each sessions as session (session.name)}
      <button
        id={`Session-${session.id}`}
        class="group max-w-full w-full m-auto p-4 bg-base-200 rounded-lg shadow-lg border-2 border-secondary hover:border-primary mb-4 cursor-pointer hover:bg-base-300 transition duration-150"
      >
        <div class="flex justify-between items-center">
          <p class="text-base-content text-xl font-medium truncate">
            {session.name}
          </p>
          <p
            class="text-neutral-content text-sm p-1 bg-neutral ml-1 border-2 border-accent rounded-full group-hover:bg-primary group-hover:text-base-100 group-hover:border-secondary"
          >
            {session.createdAt}
          </p>
        </div>
      </button>
    {/each}
  </div>
{:else}
  <div>No sessions available.</div>
{/if}

<style>
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .error {
    color: --var(color-error);
  }
</style>
