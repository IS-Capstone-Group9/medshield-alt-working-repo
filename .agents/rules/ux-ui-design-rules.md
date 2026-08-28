# Senior Enterprise UX/UI Product Design Rules

This document outlines constraints and design guidelines for creating highly functional, production-ready enterprise interfaces that are clean, professional, and optimized for data density and user utility.

---

## 1. Visual Restraint & Realism (No "Dribbble" Trends)
*   **No Faux Trends:** Do NOT use glassmorphism, excessive neon gradients, neon glows, or floating elements that lack a physical hierarchy.
*   **Purposeful Palette:** Avoid over-saturating colors. Stick to a strict, purposeful color palette consisting of:
    *   1 primary brand color (e.g. standard dark blue or slate).
    *   Standard semantic colors for statuses (Alerts/Errors = soft red, Warnings = soft amber, Success = soft green).
    *   A clean grayscale spectrum.
*   **Canvas vs. Card Layout:** Use a grounded card layout where the main page canvas is a soft, cool light gray (e.g. `#F8FAFC` or `#F3F4F6`) and all data containers and cards are pure white (`#FFFFFF`).
*   **Subtle Shadows:** Drop shadows must be ultra-subtle, realistic, and used ONLY to establish z-index depth hierarchy, never as decoration.

## 2. Functional UX Logic (Form Follows Function)
*   **Data-Appropriate Visualizations:** Do NOT use complex, flashy charts (like 3D graphs, radar charts, or multi-axis circles) if a simple bar, line, or metric-card is faster for a user to read.
*   **Standard Utility Icons:** Do not generate fake "squiggles" or placeholder blobs for icons. Use clean, recognizable standard utility icons (e.g. standard SVG line-art icons).
*   **Interactive Conventions:** Every button, dropdown, tab, and input must follow standard web conventions. Clearly distinguish primary, secondary, and tertiary actions with appropriate colors, borders, and weights.

## 3. Authentic UX Writing (No AI Buzzwords)
*   **No Buzzwords:** Do NOT use AI marketing buzzwords (e.g., "elevate," "synergize," "seamless," "paradigm-shifting," "harness," "empower").
*   **No Placeholders:** Do NOT use 'Lorem Ipsum' or alien text.
*   **Plain English Microcopy:** Write crisp, functional, human-like microcopy. Headers must be direct and plain (e.g., "Revenue by Territory" instead of "Comprehensive Territorial Financial Analytics Overview").

## 4. Code & Architecture (HTML/React/Tailwind)
*   **Semantic HTML:** Write clean, semantic HTML. Do not nest `<div>` tags unnecessarily to avoid "div soup." Use appropriate `<header>`, `<main>`, `<section>`, `<nav>`, `<aside>`, and `<footer>` tags.
*   **Interactive States:** Explicitly code styles for `:hover`, `:focus`, and `:disabled` states for all buttons and inputs.
*   **Resilient UI:** Build with empty states, pagination, search results, and loading states in mind, rather than just the "happy path" of perfect data.
