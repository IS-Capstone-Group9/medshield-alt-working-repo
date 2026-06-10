<!-- Frontend Agent README: framework-agnostic frontend guide -->
# Frontend Agent README

> A practical guide for building scalable, framework-agnostic frontend applications.

---

## 📌 Overview

This README defines the standards, principles, and conventions the frontend agent follows when building, reviewing, or refactoring frontend code. It is designed to be **framework-agnostic** — meaning the rules here apply regardless of whether the project uses React, Angular, Vue, Svelte, or vanilla JavaScript.

---

## 🧠 Core Philosophy

Frontend development has two equally important but distinct parts:

Layer
Focus

**UI/UX**
Rendering, layout, interactivity, user experience

**Data Management**
State, API calls, data flow, business logic

A framework may help with one or both — but it is **never mandatory** for both. Evaluate each layer independently.

---

## 📐 Principles

### 1. Use Frameworks Only Where They Make Sense

- Do **not** apply a framework to your entire application simply because it is available.

- Frameworks add complexity. Complexity must be justified by the value it delivers.

- Vanilla JavaScript is still a valid and powerful choice for many use cases.

- Ask: *"Does this framework solve a real problem here, or am I just following convention?"*

```js
// ✅ Good — framework used only where it provides clear value
const Form = () =>  ;

// ❌ Bad — framework pulled in for a static page with no dynamic state
ReactDOM.render(, document.getElementById('root'));
```

---

### 2. Create Small, Reusable Components

- Break your UI into the **smallest logical units** possible.

- Every button, input, header, footer, and navigation item should be its own component.

- Reuse components throughout the app — never duplicate UI logic.

- If you are not reusing your smallest components, reconsider whether you need a framework at all.

```
src/
	components/
		Button/
			Button.jsx
			Button.css
		FormField/
			FormField.jsx
		Header/
			Header.jsx
		Footer/
			Footer.jsx
```

---

### 3. Pass Only a Single Prop Object to Child Components

- Avoid polluting templates with many individual props.

- Pass a **single object** containing all necessary data.

- Use TypeScript interfaces or types to define each data model cleanly.

```ts
// ✅ Good
interface UserCardProps {
	user: {
		id: string;
		name: string;
		email: string;
		role: string;
	};
}

const UserCard = ({ user }: UserCardProps) => { ... };

// ❌ Bad
const UserCard = ({ id, name, email, role }) => { ... };
```

- This decouples parent and child components, making each easier to test and maintain.

---

### 4. Avoid Complex State Management Libraries (Unless Necessary)

- Do **not** default to Redux, Zustand, MobX, or similar libraries unless simpler solutions fall short.

- In **Angular**: plain services + RxJS cover most state management needs cleanly.

- In **React**: start with `useState` + `useContext`. Add a library only when you genuinely hit a wall.

- If you do adopt a library, choose one that is:

Simple to understand

- Easy to trace and debug

- Opinionated enough to enforce consistency

```ts
// Angular — framework-agnostic state using a plain service
@Injectable({ providedIn: 'root' })
export class UserStateService {
	private user$ = new BehaviorSubject(null);

	getUser() { return this.user$.asObservable(); }
	setUser(user: User) { this.user$.next(user); }
}
```

---

### 5. Use CSS Grid for Layouts

- **CSS Grid** is the preferred layout tool — it works in any project, with any framework.

- Avoid reaching for Bootstrap, Tailwind, or Material UI purely for layout unless the project already uses them.

- CSS Grid offers full control without adding a dependency or learning a third-party API.

```
/* ✅ Clean, portable grid layout */
.page-layout {
	display: grid;
	grid-template-columns: 250px 1fr;
	grid-template-rows: auto 1fr auto;
	min-height: 100vh;
}
```

---

## 🗂️ Project Structure Convention

```
src/
	components/       # Small, reusable UI components
	pages/            # Page-level components (composed from smaller components)
	services/         # Data fetching, state management, business logic
	models/           # TypeScript interfaces / data models
	styles/           # Global styles, CSS variables, grid definitions
	utils/            # Pure utility functions (no framework dependencies)
```

---

## ✅ Component Checklist

Before submitting or deploying any component, verify the following:

- [ ] Component is small and focused on a single responsibility

- [ ] Component is reusable and not hardcoded to one specific context

- [ ] Props are passed as a single typed object (not a long list of individual props)

- [ ] No unnecessary framework libraries are imported

- [ ] Layout uses CSS Grid (or justified alternative)

- [ ] State management is as simple as possible

- [ ] Component has no direct side effects — data fetching belongs in services

- [ ] TypeScript types are defined for all data models

---

## ⚠️ Anti-Patterns to Avoid

Anti-Pattern
Why It's a Problem

Importing Redux for a 3-screen app
Adds complexity with no real benefit

Passing 10+ individual props to a child
Couples parent and child tightly

Using a CSS framework just for layout
Adds a dependency when CSS Grid suffices

Duplicating a component instead of abstracting
Kills maintainability

Wrapping everything in a framework service
Breaks the framework-agnostic approach

Using a framework on a static page
Unnecessary overhead

---

## 🔄 Framework Compatibility

These principles are designed to work with:

- ✅ React

- ✅ Angular

- ✅ Vue

- ✅ Svelte

- ✅ Vanilla JavaScript

The goal is that code structured under these principles can be **ported or understood** regardless of which framework is in use.

---

## 📚 References

- [Framework Agnostic Programming — LinkedIn Article](https://www.linkedin.com/)

- [Official React Docs — Components and Props](https://react.dev/)

- [Official Angular Docs — Component Architecture](https://angular.dev/)

- [MDN — CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)

---

*Last updated: June 2026*

