export {};

// Number.prototype.padLeft is monkeypatched onto the global Number in time.js
declare global {
  interface Number {
    padLeft(n: number, str?: string): string;
  }
}
