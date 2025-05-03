export {};

declare global {
  interface Window {
    IntegrityAdvocate?: {
      endSession: () => void;
    };
  }
}
