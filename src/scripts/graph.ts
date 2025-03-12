export class ProbabilityGraph {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D | null;
	private probabilityData: number[] = [];
	private probability: number | null = null;
  
	constructor(canvas: HTMLCanvasElement) {
	  this.canvas = canvas;
	  this.ctx = canvas.getContext("2d");
	}
  
	// Method to update the probability value
	updateProbability(probability: number) {
	  this.probability = probability;
  
	  // Update graph data
	  if (this.probabilityData.length >= 100) {
		this.probabilityData.shift(); // Keep the array size fixed
	  }
	  this.probabilityData.push(probability);
  
	  this.drawGraph();
	}
  
	// Method to draw the probability graph
	drawGraph() {
	  if (!this.ctx) return;
  
	  const width = this.canvas.width;
	  const height = this.canvas.height;
  
	  // Clear previous graph
	  this.ctx.clearRect(0, 0, width, height);
  
	  // Draw the new graph
	  this.ctx.beginPath();
	  this.ctx.strokeStyle = "#FF5733"; // Graph color
	  this.ctx.lineWidth = 2;
  
	  const maxDataPoints = Math.floor(width / 2);
	  if (this.probabilityData.length > maxDataPoints) {
		this.probabilityData.shift();
	  }
  
	  const step = width / maxDataPoints;
	  for (let i = 0; i < this.probabilityData.length; i++) {
		const x = i * step;
		const y = height - (this.probabilityData[i] * height); // Scale the probability
		if (i === 0) {
		  this.ctx.moveTo(x, y);
		} else {
		  this.ctx.lineTo(x, y);
		}
	  }
	  this.ctx.stroke();
  
	  // Overlay probability text in the bottom-right
	  if (this.probability !== null) {
		this.ctx.fillStyle = "#FFFFFF"; // White text
		this.ctx.font = "bold 24px Arial";
		this.ctx.textAlign = "right"; // Align text to the right
		this.ctx.fillText(`Probability: ${(this.probability * 100).toFixed(1)}%`, width - 10, height - 10);
	  }
	}
  }
  
