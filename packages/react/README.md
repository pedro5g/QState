# @query-state/react

**React hook for managing URL query parameters as React state.**

`@query-state/react` provides the `useQState` hook, a fully typed, flexible, and granular solution for synchronizing URL query parameters with React state. Inspired by `useState`, it allows you to keep your state in sync with the URL, enabling SPA-friendly routing and deep-linking.

It works seamlessly with Next.js or any React SPA.

[![npm version](https://img.shields.io/npm/v/@query-state/react.svg)](https://www.npmjs.com/package/@query-state/react)
[![License](https://img.shields.io/npm/l/@query-state/react.svg)](./LICENSE)
[![Package Size](https://img.shields.io/bundlephobia/minzip/@query-state/core.svg)](https://bundlephobia.com/package/@query-state/react)

---

## 📦 Installation

```bash
# Install core and React hook
npm add @query-state/core @query-state/react
# or
pnpm add @query-state/core @query-state/react
```

### ⚠️ Peer dependencies: react and @qstate/core.

---

## Features

- Fully typed for TypeScript.

- Supports single and multiple query parameters.

- Handles primitive values, arrays, objects, and nested objects.

- Granular updates using setters for individual fields.

- Supports default values, optional parsers, and functional setters.

- Automatically infers types from defaults or parser configurations.

- Supports push/replace history, shallow updates, scroll, and URL encoding.

- Works with custom parsers for complex serialization logic.

---

## Basic Usage

```ts
import { useQState } from '@query-state/react';

const [search, setSearch] = useQState('search');
// search: string | null
setSearch('hello'); // → URL: ?search=hello
setSearch(null); // → URL: /
```

---

## With Default Values

### Default values remove null states and ensure type safety.

```ts
const [page, setPage] = useQState('page', 1);
// page: number

setPage(5); // → URL: ?page=5
setPage(null); // → resets to default 1
```

## With Options

```ts
const [search, setSearch] = useQState('search', '', {
  history: 'push', // push instead of replace
  shallow: false, // trigger component re-render
  scroll: true, // scroll to top on change
  encode: true, // encode special characters
}); // search: string
```

## Using Parsers from Core

### @qstate/core provides powerful parsers for strings, numbers, literals, booleans, and custom types.

```ts
import {
  qsParserString,
  qsParserNumber,
  qsParserStringLiteral,
} from '@qstate/core';

const [search, setSearch] = useQState(
  'search',
  qsParserString.setDefault('hello')
);
const [page, setPage] = useQState('page', qsParserNumber.setDefault(1));
const [status, setStatus] = useQState(
  'status',
  qsParserStringLiteral(['active', 'disabled']).setDefault('active')
);
```

- Parsers allow you to define default values, serialize/deserialize logic, and equality checks.

- The hook infers types from parsers automatically.

---

## Multiple Parameters (Granular Objects)

#### useQState can manage multiple parameters at once, returning a tuple of values and setters. Each field can be a primitive, parser, or nested object.

```ts
import { qsParserStringLiteral } from '@qstate/core';

const [values, setValues] = useQState({
  page: 1,
  status: qsParserStringLiteral(['active', 'disabled']).setDefault('active'),
  profile: {
    name: 'Pedro',
    age: 22,
  },
});

// Type inferred automatically:
// {
// page: number,
// status: 'active' | 'disabled',
// profile: { name: string, age: number }
// }

// Update individual values
setValues.page(2); // → ?page=2
setValues.status('disabled'); // → ?page=2&status=disabled
setValues.profile({ name: 'John', age: 30 }); // → ?page=2&status=disabled&profile=%7B%22name%22%3A%22John%22%2C%22age%22%3A30%7D
```

✅ Granular updates: Each setter affects only its field, leaving others intact.
✅ Nested objects: Automatically handle nested structures without manually writing parsers.

## Auto Type Inference

`useQState` automatically infers types from:

1. Default values (primitive, object, or array).

2. Parser configuration (setDefault, parse, serialize).

3. Literal values (qsParserStringLiteral, etc.).

```ts
const [filters, setFilters] = useQState({
  status: qsParserStringLiteral(['active', 'inactive']).setDefault('active'),
  page: 1,
  options: { theme: 'dark', showAds: true },
});

// Type:
// {
// status: 'active' | 'inactive',
// page: number,
// options: { theme: 'dark' | string, showAds: boolean }
// }
```

---

## Functional Setters

You can use functional setters for computed updates or resets.

```ts
const [value, setValue] = useQState(
  'search',
  qsParserString.setDefault('hello')
);

// Direct update
setValue('goodbye'); // → URL: ?search=goodbye

// Reset to default
setValue(null); // → URL: / (removed)

// Functional update
setValue((prev) => prev + ' world'); // → URL: ?search=hello world

// Functional reset
setValue(() => null); // → URL: /
```

Works similarly for multiple parameters:

```ts
setValues.page((prev) => prev + 1);
setValues.profile((prev) => ({ ...prev, name: 'Alice' }));
```

## Advanced: Custom Parsers

For complex objects or arrays, define custom parse/serialize logic.

```ts
const [user, setUser] = useQState('user', {
  defaultValue: { id: 0, name: 'Guest' },
  parse: (str) => JSON.parse(str),
  serialize: (obj) => JSON.stringify(obj),
  equals: (a, b) => a.id === b.id,
});

setUser({ id: 1, name: 'John' });
// → URL: ?user=%7B%22id%22%3A1%2C%22name%22%3A%22John%22%7D
```

## Objects with Auto-Nesting

Nested objects are automatically handled, no parser required for each nested field.

```ts
const [filters, setFilters] = useQState({
  user: {
    name: 'Pedro',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  },
});

// Update nested field
setFilters.user((prev) => ({
  ...prev,
  preferences: { ...prev.preferences, theme: 'light' },
}));
// → URL: ?user=%7B%22name%22%3A%22Pedro%22%2C%22preferences%22%3A%7B%22theme%22%3A%22light%22%2C%22notifications%22%3Atrue%7D%7D
```

✅ Type-safe, granular, and fully reactive.

## Notes

- Always install @qstate/core alongside @query-state/react.

- Defaults ensure non-null types.

- Parsers allow validation, custom serialization, and literal typing.

- Nested objects are automatically serialized to URL-friendly strings.

- Functional setters allow computed or partial updates.

## TypeScript Support

`useQState` provides full type inference:

- Single value: infers from default or parser.

- Multiple values: inferred automatically from object structure.

- Nested objects: deep typing preserved.

- Parsers: types derived from parser configuration.
