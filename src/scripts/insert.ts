// Define the structure of the analysis data
export type AnalysisData = {
	session_id: number;
	timestamp: number;
	x: number;
	y: number;
	prob: number;
  };
  
  // Function to send analysis data to the server
  export async function insertAnalysisData(analysisEntries: AnalysisData[]) {
	try {
	  const response = await fetch("http://localhost:8080/updateSessionAnalysis", {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		},
		credentials: "include", // Include credentials (cookies) with the request
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
  