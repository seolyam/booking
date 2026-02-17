// Shared visit duration and extension options for both client and server

export const DURATION_OPTIONS = [
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
] as const;

export const EXTEND_OPTIONS = [
  { label: "+30 minutes", value: 30 },
  { label: "+1 hour", value: 60 },
] as const;
