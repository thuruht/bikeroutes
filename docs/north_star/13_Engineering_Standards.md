# 13. Engineering Standards & Best Practices

This document outlines the technical standards for development on BikeRoutes.org, covering Cloudflare Workers, React, and data management.

## 1. Cloudflare Workers (Backend)

### Telemetry & Logging
*   **Structured Logging:** Avoid `console.log`. Use structured JSON logging to allow for easier parsing and monitoring.
*   **Non-Blocking Logic:** Use `ctx.waitUntil()` for any logging or analytics calls to ensure they do not increase response latency.
*   **Error Handling:** Use explicit `try/catch` blocks around external API calls (Valhalla, PayPal, Vectorize). Log the full error context but return clean, user-friendly error messages (e.g., `503 Service Unavailable`).

### Data Access (KV, R2, D1)
*   **Null Checks:** Always perform explicit null-checks on all return values from KV (`get`) and R2 (`get`).
*   **Memory Management:** Avoid loading large GeoJSON strings or binary data into memory. Prefer streaming responses directly from R2 to the client when possible.
*   **D1 Prepared Statements:** Never use string interpolation in SQL queries. Always use strictly prepared statements with `.bind()`.

### Performance
*   **Subrequests:** Minimize the number of subrequests per invocation. Use KV or R2 for caching frequently accessed data (like map tiles or computed routes).
*   **Cold Starts:** Keep the worker bundle small to minimize cold start times.

## 2. React (Frontend)

### State & Effects
*   **Effect Dependencies:** Always provide a complete dependency array for `useEffect`. Use ESLint to catch missing dependencies.
*   **Purity:** Keep component rendering pure. Avoid side effects (like `Date.now()`) directly in the render path; use `useMemo` or `useEffect`.
*   **State Updates:** Avoid synchronous state updates within `useEffect` that trigger immediate re-renders. Use functional updates or combine state where possible.

### Event Management
*   **Global Scope:** Never attach event handlers or methods to the global `window` object (e.g., `window.routeTo`). Use standard React props and DOM event listeners.
*   **Debouncing:** Debounce high-frequency events like window resizing or map movements to prevent performance degradation.

## 3. Data Integrity & Typings

### TypeScript
*   **Explicit Typing:** Avoid the use of `any`. Define strict interfaces for all API response shapes, environmental bindings (`Env`), and complex component props.
*   **Standard Library:** Rely on `@cloudflare/workers-types` for backend development and standard React types for the frontend.

### Validation
*   **Coordinate Format:** Validate all latitude/longitude inputs before processing. Reject requests with invalid formats or out-of-bounds coordinates.
*   **Schema Consistency:** Ensure D1 schema migrations are tracked and applied consistently across development and production environments.
