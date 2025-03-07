<script>
  import * as d3 from "d3";

  let container;
  let width = 0;
  let height = 0;
  let clickedID = null;
  let resizeObserver;

  function checkSessionStorage() {
    clickedID = sessionStorage.getItem("clickedID");
    if (clickedID) {
      fetchAnalysis();
    }
  }

  let graphData = [];

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
        graphData = data;
      })
      .catch((error) => {
        console.error("Error fetching analysis data:", error);
      });
  }

  const handleStorageEvent = (event) => {
    console.log("Storage event received:", event);
    if (event.key === "clickedID") {
      checkSessionStorage();
    }
  };

  import { onMount, tick } from "svelte";
  onMount(async () => {
    checkSessionStorage();
    window.addEventListener("storage", handleStorageEvent);

    await tick();

    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === container) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          width = newWidth;
          height =
            newHeight ||
            container.clientHeight ||
            container.parentElement.clientHeight;

          // Force re-render if we have data
          if (graphData?.length) {
            renderChart();
          }
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  });

  // // Reactive block: re-render the chart when width and height are available
  // $: if (width && height && graphData?.length) {
  //   renderChart();
  // }

  $: if (graphData?.length) {
    if (width && height) {
      renderChart();
    }
  }

  function renderChart() {
    // Clear previous SVG if any
    d3.select(container).select("svg").remove();

    // Create a responsive SVG with viewBox
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Define margins for the chart area
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Append a group element for the chart area
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create x-scale using the timestamp
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(graphData, (d) => d.timestamp))
      .range([0, chartWidth]);

    // Create y-scale using the probability
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(graphData, (d) => d.prob)])
      .range([chartHeight, 0]);

    // Generate the line using timestamp for x and prob for y
    const line = d3
      .line()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.prob))
      .curve(d3.curveMonotoneX); // smooth the line

    // Append the line path to the group and animate its drawing
    const path = g
      .append("path")
      .datum(graphData)
      .attr("fill", "none")
      .attr("stroke", "url(#line-gradient)")
      // Create gradient definition
      .call(() => {
        // Define gradient
        const gradient = svg
          .append("defs")
          .append("linearGradient")
          .attr("id", "line-gradient")
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", 0)
          .attr("y1", chartHeight)
          .attr("x2", 0)
          .attr("y2", 0);

        // Add gradient stops
        gradient
          .append("stop")
          .attr("offset", "0%")
          .attr("stop-color", "var(--color-success)");

        gradient
          .append("stop")
          .attr("offset", "50%")
          .attr("stop-color", "var(--color-accent)");

        gradient
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", "var(--color-error)");
      })
      .attr("stroke-width", 2)
      .attr("d", line);

    // Get the total length of the path
    const totalLength = path.node().getTotalLength();

    // Set up the starting conditions of the path: hidden by dash offset
    path
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition() // start a transition
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    // Add the x-axis
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .append("text")
      .attr("fill", "var(--color-neutral-content)")
      .attr("x", chartWidth)
      .attr("y", "3vh")
      .attr("text-anchor", "end")
      .style("fill", "var(--color-neutral-content)")
      .style("font-size", "14px")
      .text("Time");

    // Add the y-axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .append("text")
      .attr("fill", "var(--color-neutral-content)")
      .attr("transform", "rotate(-90)")
      .attr("y", "1vh")
      .attr("dy", "-2.5em")
      .attr("text-anchor", "end")
      .style("fill", "var(--color-neutral-content)")
      .style("font-size", "14px")
      .text("Probability");
  }
</script>

<!-- The container fills its parent and has a minimum height to ensure it's visible -->
<div
  bind:this={container}
  bind:clientWidth={width}
  bind:clientHeight={height}
  class="w-full h-full min-h-[60vh] border-2 border-accent rounded-lg shadow-lg backdrop-filter backdrop-blur-lg bg-opacity-20 bg-neutral before:absolute before:inset-0 before:rounded-lg relative overflow-hidden"
>
  <!-- D3 chart will render here -->
</div>
