# Frontend Standards

## Description
Defines the frontend rules for the MedShield dashboard. The project uses Next.js, React, and TypeScript, so these standards focus on responsive UI, clear component boundaries, accessible interactions, and predictable data handling. The frontend should feel like a working analytics tool, not a demo shell. It needs to help a user scan information quickly, compare values, and move through common tasks without friction. In the capstone context, the interface should support the story of business decision-making, not just present raw data.

## Workflow
1. Review the page goal, user flow, and data needs before building UI.
2. Break the screen into reusable components and keep presentation separate from data access.
3. Implement loading, empty, and error states as part of the feature, not as an afterthought.
4. Map the screen to the relevant dashboard data and reporting intent.
5. Verify responsive behavior and text fit on common viewport sizes.
6. Check the result for consistency with the rest of the project and with the documented stack.
7. Confirm that the screen tells the right business story when the capstone is presented.

## Rules
- Use reusable components for repeated UI patterns.
- Keep props and data shapes typed.
- Prefer local state before introducing shared state.
- Keep API calls and business logic out of presentation components when practical.
- Make layouts responsive and readable on mobile and desktop.
- Avoid unnecessary visual complexity in dashboards and operational tools.
- Ensure every interactive control has a clear purpose and accessible behavior.
- Use CSS variables and the existing layout conventions before introducing new styling systems.
- Ensure important information is visible without requiring unnecessary interaction.
- Keep empty, loading, and error states intentional and polished.
- Match the density of the interface to the task: operational screens should be compact and scannable, not ornamental.

## Project Conventions
- Follow the MedShield dashboard structure in `docs/SETUP.md` and `docs/IMPLEMENTATION.md`.
- Keep components focused on one responsibility.
- Use named types or interfaces for component data contracts.
- Keep charts, tables, filters, and summary cards visually consistent.
- Update supporting documentation when frontend behavior changes.
