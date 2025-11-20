# bloom-sift

Bloom filter using 128-bit MurmurHash3 with Kirsch-Mitzenmacher double hashing.

[![npm version](https://img.shields.io/npm/v/bloom-sift.svg)](https://www.npmjs.com/package/bloom-sift)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/bloom-sift.svg)](https://nodejs.org)

## Overview

A space-efficient probabilistic data structure for set membership testing. Uses a single 128-bit hash to derive all k hash values via double hashing:

```
h(i) = h1 + i * h2
```

**Features:**
- Single hash call for all k values (fast)
- Automatic optimal parameter calculation
- Serialization for storage/transfer
- Works in Node.js and browsers
- Zero dependencies (except murmur-hash)

## Installation

```bash
npm install bloom-sift
```

## Quick Start

```typescript
import { BloomSift } from 'bloom-sift';

const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

filter.add('user:123');
filter.has('user:123');  // true
filter.has('user:456');  // false (probably)
```

## API

### Constructor

```typescript
new BloomSift({ capacity: number, errorRate: number })
```

- `capacity` - Expected number of items
- `errorRate` - Desired false positive rate (0 < p < 1)

### Methods

```typescript
filter.add(item: string | Uint8Array): void
filter.has(item: string | Uint8Array): boolean
filter.clear(): void
filter.serialize(): SerializedBloomSift
BloomSift.deserialize(data: SerializedBloomSift): BloomSift
```

### Properties

```typescript
filter.size       // number of bits
filter.hashCount  // number of hash functions (k)
filter.count      // items added
filter.fillRatio  // saturation (0 to 1)
```

### Utility

```typescript
import { calculateOptimalParams } from 'bloom-sift';

const { size, hashCount } = calculateOptimalParams(1000, 0.01);
// { size: 9586, hashCount: 7 }
```

## Usage Examples

### Serialization

```typescript
const data = filter.serialize();
localStorage.setItem('filter', JSON.stringify(data));

// Later...
const restored = BloomSift.deserialize(JSON.parse(localStorage.getItem('filter')));
```

### Binary Data

```typescript
filter.add(new Uint8Array([1, 2, 3]));
filter.has(new Uint8Array([1, 2, 3]));  // true
```

### Reusing Filters

```typescript
filter.add('item-1');
filter.clear();
filter.count;  // 0
```

## How It Works

Given capacity `n` and error rate `p`:

- Bit size: `m = -n * ln(p) / (ln(2)²)`
- Hash count: `k = (m/n) * ln(2)`

The 128-bit MurmurHash3 output is split into two 64-bit values (h1, h2). Each of the k bit positions is computed as `(h1 + i * h2) % m`, providing the same theoretical guarantees as k independent hashes.

## Performance

Tested on Apple M1 Pro:

| Operation | Ops/sec |
|-----------|---------|
| add       | ~220K   |
| has       | ~250K   |

Run benchmarks:

```bash
npm run bench
```

## TypeScript

Full TypeScript support with bundled type definitions. Exports:

- `BloomSift` - Main class
- `BloomSiftOptions` - Constructor options interface
- `SerializedBloomSift` - Serialization format interface
- `calculateOptimalParams` - Utility function

## Limitations

- **No deletions** - Use counting Bloom filters for that
- **Fixed size** - Capacity must be set upfront
- **False positives** - May report items as present when they're not (never false negatives)

## License

MIT
