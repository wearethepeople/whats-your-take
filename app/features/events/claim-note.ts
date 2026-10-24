// Deliberately not a .server module: the host event form (a route component)
// uses this as the input's maxLength, and React Router refuses a *.server
// import from code that ships to the client. updateClaimNote enforces it.
export const CLAIM_NOTE_MAX = 280;
