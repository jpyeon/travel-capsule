// Pure utility functions for temperature conversion.
// No domain logic, no external libs.

/** Converts Celsius to Fahrenheit. */
export function celsiusToFahrenheit(c: number): number {
  return Math.round(c * 9 / 5 + 32);
}

/** Converts Fahrenheit to Celsius. */
export function fahrenheitToCelsius(f: number): number {
  return Math.round((f - 32) * 5 / 9);
}
