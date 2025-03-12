export interface Coordinates {
	x: number;
	y: number;
  }
  
  export interface AffineMatrix {
	a: number; // scaling + shearing factor for x
	b: number; // shearing factor for y
	c: number; // shearing factor for x
	d: number; // scaling + shearing factor for y
	e: number; // translation factor for x
	f: number; // translation factor for y
  }
  
  export function calculateAffineTransformation(
	initialPoint: Coordinates,
	currentPoint: Coordinates
  ): AffineMatrix {
	// Calculate the affine transformation matrix based on initial and current reference points.
	const dx = currentPoint.x - initialPoint.x; // Change in x
	const dy = currentPoint.y - initialPoint.y; // Change in y
  
	// Example transformation matrix (just translation in this case)
	const matrix: AffineMatrix = {
	  a: 1,  // No scaling (1 means no scaling)
	  b: 0,  // No shearing
	  c: 0,  // No shearing
	  d: 1,  // No scaling
	  e: dx, // Translation in x
	  f: dy, // Translation in y
	};
  
	return matrix;
  }
  
  export function applyAffineTransformation(
	coords: Coordinates,
	matrix: AffineMatrix
  ): Coordinates {
	// Apply affine transformation: (x', y') = (a * x + b * y + e, c * x + d * y + f)
	const xPrime = matrix.a * coords.x + matrix.b * coords.y + matrix.e;
	const yPrime = matrix.c * coords.x + matrix.d * coords.y + matrix.f;
  
	return { x: xPrime, y: yPrime };
  }
  