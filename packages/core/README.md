# @query-state/core

`@query-state/core` is the core package of the Query State library, a lightweight and reactive query manager for URL state.  
It leverages **observer patterns** and a **pub/sub system** to allow fine-grained control over query parameters in your application.

[![npm version](https://img.shields.io/npm/v/@query-state/core.svg)](https://www.npmjs.com/package/@query-state/core)
[![License](https://img.shields.io/npm/l/@query-state/core.svg)](./LICENSE)
[![Package Size](https://img.shields.io/bundlephobia/minzip/@query-state/core.svg)](https://bundlephobia.com/package/@query-state/core)

---

## 📦 Installation

```bash
npm i @query-state/core
# or
pnpm i @query-state/core

```

---

## 💡 Overview

This package provides a Query Manager that:

- Observes the browser URL and query parameters

- Notifies subscribers only for the keys that changed

- Applies updates in order using a microtask queue to avoid race conditions

- Patches history.pushState and history.replaceState for controlled updates

- Supports silent updates without triggering notifications

- Handles rate-limiting for high-frequency updates

---

## ⚙️ How the Query Manager Works

The core of @query-state/core is the Query Manager, implemented via the ImpQueryManager class.

It:

1. Listens to changes in the URL via:

- popstate events (browser back/forward)

- Custom **qschange** events dispatched on query updates

2. Maintains a subscriber list per query key for granular notifications

3. Uses a microtask queue to apply multiple updates in order

4. Rate-limits updates with configurable options

5. Patches the browser history API (pushState / replaceState)

6. Allows silent updates that modify the URL without notifying subscribers

---

## Internal Flow

sequenceDiagram
participant Browser as Browser URL
participant Manager as QueryManager
participant Queue as QueryQueue
participant Consumer as Subscriber

    Browser->>Manager: URL changes (popstate or __qschange__)
    Manager->>Queue: Enqueue updates in microtask
    Queue->>Manager: Apply queued updates
    Manager->>Consumer: Notify subscribers of changed keys

### Key points:

- Granular Updates: Only affected subscribers are notified.

- Microtask Queue: Ensures updates are applied in order.

- Silent Updates: Modify URL without notifications (silentUpdate).

---

## 📦 Public API

@query-state/core exposes convenient accessors for interacting with the query state:

| Function                                                                                            | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `readParam(key: string)`                                                                            | Reads the current value of a query key from the URL.                            |
| `writeParam(key: string, value: string \| null, mode?: 'push' \| 'replace', options?: FullOptions)` | Updates a query key in the URL and notifies subscribers.                        |
| `subscribeQS(callback: () => void, key: string)`                                                    | Subscribes to changes of a specific query key. Returns an unsubscribe function. |

---

### Example: Subscribing and Updating Query Keys

```ts
import { subscribeQS, writeParam, readParam } from '@query-state/core';

// Subscribe to a query key
const unsubscribePage = subscribeQS(() => {
  const page = readParam('page');
  console.log('Page changed:', page);
}, 'page');

// Update a query key
writeParam('page', '2'); // triggers __qschange__ event

// Later, if you want to stop listening
unsubscribePage();
```

---

### Example: Using Accessors for Multiple Keys

```ts
import { readParam, writeParam, subscribeQS } from '@query-state/core';

// Read a key
console.log(readParam('limit')); // e.g. "10"

// Subscribe to changes
const unsubscribeLimit = subscribeQS(() => {
  console.log('Limit changed:', readParam('limit'));
}, 'limit');

// Update a key
writeParam('limit', '20'); // triggers subscriber

// Stop listening when done
unsubscribeLimit();
```

---

## 📖 Features

- Reactive URL state: Automatically observes changes in query parameters.

- Granular updates: Only notifies subscribers of keys that changed.

- Safe history API patching: Avoids breaking browser back/forward navigation.

- Queue system: Applies multiple updates in order to avoid conflicts.

- Rate-limiting support: Prevents excessive updates in high-frequency scenarios.

- Silent updates: Modify URL without triggering subscribers.

- TypeScript support: Full typings for queries, options, and events.

---

## 🔹 Query State Parsers (`qsParser`)

`@query-state/core` provides a set of **type-safe parsers** to convert query string values from the URL into strongly-typed data and back.  
These parsers are built using the `createParser` builder, allowing customization, default values, and equality checks.

### ⚙️ How it works

Each parser implements a **parse/serialize interface**:

```ts
interface ParserConfig<T> {
  parse?: (value: string) => T | null;
  serialize?: (value: T) => string;
  equals?: (a: T, b: T) => boolean;
}
```

- parse: Converts a string from the URL to a typed value.

- serialize: Converts a typed value back to a string for the URL.

- equals (optional): Compares two values for equality.

You can also extend parsers with options like defaultValue, history mode, rateLimit, and more.

---

## 🔹 Built-in Parsers

(`Boolean`):

```ts
import { qsParserBoolean } from '@query-state/core';

const parsed = qsParserBoolean.parse('true'); // true
const serialized = qsParserBoolean.serialize(false); // "false"
```

(`String`):

```ts
import { qsParserString } from '@query-state/core';

qsParserString.parse('hello'); // "hello"
qsParserString.serialize('world'); // "world"
```

(`Integer & Float`):

```ts
import { qsParserInteger, qsParserFloat } from '@query-state/core';

qsParserInteger.parse('42'); // 42
qsParserFloat.parse('3.14'); // 3.14
```

(`Date & Timestamp`):

```ts
import {
  qsParserTimestamp,
  qsParserDateTime,
  qsParserISODate,
} from '@query-state/core';

qsParserTimestamp.parse('1697685600000'); // Date object from milliseconds
qsParserDateTime.parse('2025-10-18T23:00:00.000Z'); // Date object from ISO string
qsParserISODate.parse('2025-10-18'); // Date at midnight UTC
```

(`Literal Types`):

```ts
import {
  qsParserStringLiteral,
  qsParserNumberLiteral,
} from '@query-state/core';

const colorParser = qsParserStringLiteral(['red', 'green', 'blue']);
colorParser.parse('red'); // "red"
colorParser.parse('yellow'); // null

const numberParser = qsParserNumberLiteral([1, 2, 3]);
numberParser.parse('2'); // 2
numberParser.parse('5'); // null
```

(`JSON`):

```ts
import { qsParserJson } from '@query-state/core';

const userParser = qsParserJson<{ id: number; name: string }>();
userParser.parse('{"id":1,"name":"Pedro"}'); // { id: 1, name: "Pedro" }
userParser.serialize({ id: 2, name: 'Alice' }); // '{"id":2,"name":"Alice"}'
```

(`Arrays`):

```ts
import { qsParserArray, qsParserInteger } from '@query-state/core';

const arrayParser = qsParserArray(qsParserInteger, ',');
arrayParser.parse('1,2,3'); // [1, 2, 3]
arrayParser.serialize([4, 5, 6]); // "4,5,6"
```

## 💡 Customization & Defaults

All parsers can be extended with defaults and custom options:

```ts
const booleanWithDefault = qsParserBoolean.setDefault(true);
const stringLimited = qsParserString.defineOptions({ history: 'push' });
```

---

## 🔹 Use Case

When reading or writing query parameters, you can parse safely into the expected type and serialize back to the URL, ensuring type safety and avoiding invalid values:

```ts
import { readParam, writeParam } from '@query-state/core';

const page = qsParserInteger.parse(readParam('page')); // safely parse page number
writeParam('page', qsParserInteger.serialize(2)); // update URL
```

## 🛠️ Advanced Usage

You can integrate @query-state/core with any frontend framework (React, Vue, etc.) to manage URL query state reactively, ensuring your UI is always in sync with the browser URL.
