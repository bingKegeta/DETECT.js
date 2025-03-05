<script>
  let clickedID = null;

  // Function to check sessionStorage
  function checksessionStorage() {
    const storedID = sessionStorage.getItem("clickedID");
    if (storedID) {
      clickedID = storedID;
    }
    fetchAnalysis();
    // generateRandomData();
  }

  // Reactive variable to hold table rows
  let tableData = [];

  // Testing function to generate random data
  function generateRandomData() {
    const rows = [];
    const numRows = 6;

    for (let i = 0; i < numRows; i++) {
      const timestamp = i;
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      const probability = Math.random().toFixed(2);
      rows.push({ timestamp, x, y, probability });
    }
    tableData = rows;
  }

  function fetchAnalysis() {
    if (!clickedID) {
      return;
    }
    const url = `${import.meta.env.PUBLIC_SERVER_ADDRESS}/sessionAnalysis?id=${clickedID}`;
    // Fetch analysis data from the server
    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Analysis data received:", data);
        tableData = data;
      })
      .catch((error) => {
        console.error("Error fetching analysis data:", error);
      });
  }

  import { onMount } from "svelte";

  // This allows the component to listen for changes to the sessionStorage
  const handleStorageEvent = (event) => {
    console.log("Storage event received:", event);
    if (event.key === "clickedID") {
      checksessionStorage();
    }
  };

  onMount(() => {
    // Initial check when component mounts
    checksessionStorage();

    window.addEventListener("storage", handleStorageEvent);

    // Cleanup function that runs when component is destroyed
    return () => {
      window.removeEventListener("storage", handleStorageEvent);
    };
  });
</script>

{#if clickedID}
  <div
    class="p-2 border-2 border-secondary rounded-lg bg-base-200 text-base-content w-fit h-full flex flex-col"
  >
    <p>Session <strong>{clickedID}</strong> clicked</p>

    <div
      class="overflow-x-auto flex-grow flex flex-col rounded-lg border-2 border-accent"
    >
      <table
        class="min-w-fit divide-y-2 divide-accent [&_:is(th,td):where(:nth-child(1),:nth-child(4))]:text-center"
      >
        <thead class="bg-primary text-base-100 sticky top-0 z-10">
          <tr>
            <th class="px-4 py-2 text-xs font-medium uppercase tracking-wider">
              Timestamp
            </th>
            <th class="px-4 py-2 text-xs font-medium uppercase tracking-wider">
              X
            </th>
            <th class="px-4 py-2 text-xs font-medium uppercase tracking-wider">
              Y
            </th>
            <th class="px-4 py-2 text-xs font-medium uppercase tracking-wider">
              Probability
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-content">
          {#if tableData.length > 0}
            {#each tableData as row, index (index)}
              <tr
                class="hover:bg-secondary hover:text-secondary-content transition-colors
                      odd:bg-neutral even:bg-base-200"
              >
                <td class="px-4 py-2 text-sm">{row.timestamp}</td>
                <td class="px-4 py-2 text-sm">{row.x}</td>
                <td class="px-4 py-2 text-sm">{row.y}</td>
                <td class="px-4 py-2 text-sm">{row.prob}</td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td
                colspan="4"
                class="px-4 py-4 text-sm text-neutral-content text-center"
              >
                No data available
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
{:else}
  <div
    class="p-2 m-2 border-2 border-secondary rounded-lg bg-base-200 text-base-content"
  >
    <p>No session selected</p>
  </div>
{/if}
