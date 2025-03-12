// smoothing.ts
export function applySmoothing(value: number, previousValues: number[], smoothingFactor: number = 0.1): number {
	// Apply Exponential Moving Average (EMA) for smoothing
	if (previousValues.length > 0) {
	  const smoothedValue = smoothingFactor * value + (1 - smoothingFactor) * previousValues[previousValues.length - 1];
	  previousValues.push(smoothedValue);
	  if (previousValues.length > 10) previousValues.shift(); // Keep the last 10 values
	  return smoothedValue;
	}
	previousValues.push(value);
	return value;
  }
  