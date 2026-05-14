// Ambient declarations for the localStorage/Supabase storage shim
// installed on `window` in index.tsx.
interface StorageShim {
  get: (key: string) => Promise<{ value: string } | null>;
  set: (key: string, value: string) => Promise<{ value: string } | null>;
}

interface Window {
  storage?: StorageShim;
}
