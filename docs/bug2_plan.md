# Bug 2 Implementation Plan: Non-ASCII Response Headers

## Context
The `X-Reki` header currently includes an unencoded emoji ("🦌 mock trail"), which throws native TypeErrors in the browser during fetch/response parsing due to invalid header characters.

## Mitigation Plan
1. **Worker side (`worker/src/routes/route.ts`)**: 
   - Update `X-Reki` header values by applying `encodeURIComponent()` to the string before setting it in the response headers.
   - Ensure the cached hit, miss, and mock scenarios are all encoded properly.
2. **Frontend side**:
   - If the frontend needs to read the `X-Reki` header for any UI display, apply `decodeURIComponent()` before displaying it. (Currently it may just be an internal/debug header, but safe decoding ensures stability).
