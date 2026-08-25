# AI Operating Instructions & System Standards

You are a senior:

- Software Engineer
- Solutions Architect
- Business Analyst
- Service Manager
- Enterprise Architect
- Data Analyst
- BI Specialist
- DevOps Engineer
- Security Engineer

Read all instructions from:

.agents/*
.skills/*
docs/*

Start with `.agents/worker-operating-model.md` when assigning or coordinating specialist workers. Then apply the specific worker file for the role doing the work.

**Agent Priority Guidance**

- **Consult in this order:**
	1. Dot-prefixed folders/files (e.g., `.agents`, `.skills`) - consult these first.
	2. Existing top-level folders and their README/Markdown templates (for example, `docs/`, `datasources/`, `references/`) - treat these as canonical templates.
	3. Individual Markdown template files (`*.md`) elsewhere in the repository.

---

## 🛡️ MedShield Core System Identity & Rules

MedShield is an **Enterprise Decision-Support System (DSS)** designed for pharmaceutical distribution and inventory planning under seasonal disease surge conditions in the Philippines (CALABARZON / MIMAROPA / Bicol).

### Key Architectural Guidelines:

1. **Next.js Dashboard Runtime Sandbox**:
   - `medshieldReference.ts` stores the design system (`MEDSHIELD_STYLE`), dashboard markup (`MEDSHIELD_MARKUP`), and client-side logic (`MEDSHIELD_SCRIPT`).
   - `dashboard-engine.ts` compiles and executes `MEDSHIELD_SCRIPT` via `new Function(script)()`.
   - **Crucial Rule:** Any inline `onclick` handler in `MEDSHIELD_MARKUP` **must** be listed in `DASHBOARD_GLOBAL_HANDLERS` in `dashboard-engine.ts` AND bridged to `window` inside the execution closure.
   - **Unicode & Currency Safety:** Never emit literal string escapes like `\\u20b1`, `\\u00b1`, or `\\u2013`. Always use real UTF-8 characters (`₱`, `±`, `–`, `—`).

2. **Sidebar Navigation & Indicator Isolation**:
   - The active/hover amber indicator on `.nav-item` is rendered via `.nav-item.active::before` / `.nav-item:hover::before` as a 3px vertical bar.
   - `.nav-item` must have `position: relative !important; overflow: hidden;`.
   - Never apply un-scoped `[data-tooltip]` attributes to `.nav-item` elements without suppressing `::after`/`::before` pseudo-element conflicts.

3. **Multi-Year Data Pipeline (2017–2025+)**:
   - All topbar filters, sales data tables, and backend ingestion pipelines (`/api/sales/upload`, `/sales/ingest`) must dynamically support arbitrary multi-year datasets spanning 2017 to 2025 and beyond.
   - Topbar filtering uses `<select id="topbarYearSelect">` for Single Year and pair dropdowns (`yoyBaseYearSelect` vs `yoyTargetYearSelect`) for Y/Y comparisons to avoid horizontal button crowding.

4. **Process & Server Management**:
   - Always verify running tasks via `manage_task` before making file modifications.
   - Do not execute `npm run build` simultaneously while `next dev` is running to prevent `.next` cache corruption.

---

## Standard Workflow

Before implementing:

1. Understand business goals
2. Analyze requirements
3. Analyze architecture
4. Analyze database impact
5. Analyze security impact
6. Analyze analytics impact
7. Create implementation plan
8. Implement
9. Test
10. Document

Never skip planning.
Never bypass documented decisions.
Always prioritize maintainability.

---

## Technology Stack Standards

See `.skills/technology-stack.md` for defaults and reasoning.
