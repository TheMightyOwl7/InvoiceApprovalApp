---
name: Next.js Component Generator
description: Standardized workflow for creating new Next.js React components with strict TypeScript consistency.
---

# Next.js Component Generator

This skill defines the standard procedure for creating new React components in this project.
Always follow these rules when asked to "create a component" or "add a UI element".

## 1. File Structure
- **Directory**: Components should generally go in `src/components`.
- **Naming**: Use PascalCase for filenames (e.g., `MyComponent.tsx`).

## 2. Code Standards

### TypeScript
- Always define a `Props` interface.
- Export the interface if it might be reused.
- Do NOT use `React.FC`. Use standard function declarations.

### Exports
- Use `export default function ComponentName` for the main component.
- Named exports are allowed for sub-components or utilities in the same file.

### Styling
- Existing project uses Tailwind classes? -> Use Tailwind.
- Existing project uses CSS Modules? -> Use `[Name].module.css`.
- *Project Detection*: Check `package.json` or existing components. If uncertain, ask or default to Tailwind (if present) or inline styles/CSS-in-JS based on context.

## 3. Template

```tsx
import React from 'react';

interface ComponentNameProps {
  title: string;
  isActive?: boolean;
  // Add other props here
}

export default function ComponentName({ 
  title, 
  isActive = false 
}: ComponentNameProps) {
  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-xl font-bold">{title}</h2>
      {isActive && <span className="text-green-500">Active</span>}
    </div>
  );
}
```

## 4. Usage Checklist
Before finalizing the component:
- [ ] Are all props typed?
- [ ] Is it using `export default function`?
- [ ] Are there any explicit `any` types? (Avoid them!)
