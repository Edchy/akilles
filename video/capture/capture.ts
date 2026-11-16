// Capture copy only: which still the video needs, from the link's ?shot=.
export const shot = (): string => (globalThis as any).__SHOT ?? "";
