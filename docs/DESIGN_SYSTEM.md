# Atlas — Design System

## Tokens

All design tokens are defined in two places that mirror each other:

| Location | Format | Purpose |
|---|---|---|
| `src/shared/theme/tokens.ts` | TypeScript constants | Used in React components and programmatic access |
| `src/shared/theme/globals.css` | CSS custom properties | Used by Tailwind utility classes and plain CSS |

### Colors

- **Neutral**: Zinc-gray scale (50–950) for UI surfaces, text, and borders
- **Primary**: Indigo (50–950) for accent actions and highlights
- **Success** / **Warning** / **Error**: Semantic colors at 50 (light), 500 (default), 950 (dark)

### Typography

- **UI font**: Inter, system-ui, -apple-system, sans-serif
- **Code font**: JetBrains Mono, Fira Code, monospace
- **Scale**: 2xs through 6xl with matching line-height

### Spacing

Tailwind default 4px-base scale (0 through 96).

### Border Radius

`none` → `full` (sm: 4px, md: 8px, lg: 12px, xl: 16px, 2xl: 24px).

### Shadows

Six elevation levels (`sm` through `2xl`) using black-with-alpha.

### Motion

- **Durations**: fast (100ms) → slowest (500ms)
- **Easings**: linear, in, out, inOut, inExpo, outExpo

### Icons

Standard sizing: xs (12px) → xl (32px).

## Tailwind

`tailwind.config.ts` maps CSS custom properties to Tailwind's theme extension, making tokens available as utility classes:

```tsx
<div className="bg-neutral-100 text-primary-600 rounded-lg shadow-md" />
```

## Layout Components

| Component | Purpose |
|---|---|
| `AppShell` | Full-viewport flex column container |
| `TopBar` | Fixed-height top header |
| `Sidebar` | Fixed-width left panel |
| `MainContent` | Flexible main content area |

All layout components are purely presentational — no state, no logic, no navigation.
