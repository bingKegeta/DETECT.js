import { tick } from "svelte";

// Define the structure of the analysis data
export type AnalysisData = {
	session_id: number;
	timestamp: number;
	x: number;
	y: number;
	prob: number;
  };
  
  const serverAddress = import.meta.env.PUBLIC_SERVER_ADDRESS;
  // Function to send analysis data to the server
  export async function insertAnalysisData(analysisEntries: AnalysisData[]) {
	try {
		await tick(); // Ensures the sessionId update is applied
	  	const response = await fetch(`${serverAddress}/updateSessionAnalysis`, {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify(analysisEntries),
	  });
  
	  if (!response.ok) {
		throw new Error("Failed to insert analysis data");
	  }
  
	  const result = await response.json();
	  console.log(result.message); // Handle success message
  
	} catch (error) {
	  console.error("Error inserting analysis data:", error);
	}
  }
  
