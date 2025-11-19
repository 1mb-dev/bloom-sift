# bloom-sift

[![npm version](https://img.shields.io/npm/v/bloom-sift.svg)](https://www.npmjs.com/package/bloom-sift)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Bloom filter with 128-bit MurmurHash3 optimization using the Kirsch-Mitzenmacher technique.

## Why bloom-sift?

Traditional Bloom filters need k hash functions, requiring either k hash calls (slow) or weak hash combinations (poor distribution). bloom-sift uses a single 128-bit MurmurHash3 call to derive all k hash values:

```
h(i) = h1 + i * h2
```

Where h1 and h2 are the upper and lower 64 bits of the 128-bit hash.

## Installation

```bash
npm install bloom-sift
```

## Quick Start

```typescript
import { BloomSift } from 'bloom-sift';

// Create filter for ~1000 items with 1% false positive rate
const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

// Add items
filter.add('user:123');
filter.add(new Uint8Array([1, 2, 3]));

// Check membership
filter.has('user:123');    // true
filter.has('user:456');    // false (probably)

// Serialization
const data = filter.serialize();
const restored = BloomSift.deserialize(data);

// Stats
console.log(filter.size);       // 9586 (bits)
console.log(filter.hashCount);  // 7 (k value)
console.log(filter.count);      // 2 (items added)
```

## API Reference

### `new BloomSift(options)`

Creates a new Bloom filter.

**Options:**
- `capacity` (number) - Expected number of items
- `errorRate` (number) - Desired false positive rate (0 < errorRate < 1)

```typescript
const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });
```

### `filter.add(item)`

Adds an item to the filter.

**Parameters:**
- `item` (string | Uint8Array) - Item to add

```typescript
filter.add('hello');
filter.add(new Uint8Array([1, 2, 3]));
```

### `filter.has(item)`

Checks if an item might be in the filter.

**Parameters:**
- `item` (string | Uint8Array) - Item to check

**Returns:** `boolean` - `true` if item might be present, `false` if definitely not present

```typescript
filter.has('hello');  // true if added, false if not
```

### `filter.serialize()`

Serializes the filter to a JSON-friendly format.

**Returns:** `SerializedBloomSift` - Object with bits (base64), size, hashCount, count

```typescript
const data = filter.serialize();
// Store in database, send over network, etc.
localStorage.setItem('filter', JSON.stringify(data));
```

### `BloomSift.deserialize(data)`

Restores a filter from serialized data.

**Parameters:**
- `data` (SerializedBloomSift) - Serialized filter data

**Returns:** `BloomSift` - Restored filter instance

```typescript
const data = JSON.parse(localStorage.getItem('filter'));
const filter = BloomSift.deserialize(data);
```

### Properties

- `filter.size` (number) - Number of bits in the filter
- `filter.hashCount` (number) - Number of hash functions (k)
- `filter.count` (number) - Approximate number of items added

### `calculateOptimalParams(capacity, errorRate)`

Calculates optimal filter parameters.

**Parameters:**
- `capacity` (number) - Expected number of items
- `errorRate` (number) - Desired false positive rate

**Returns:** `{ size: number, hashCount: number }`

```typescript
import { calculateOptimalParams } from 'bloom-sift';

const { size, hashCount } = calculateOptimalParams(1000, 0.01);
// size: 9586, hashCount: 7
```

## Use Cases

1. **Duplicate detection** - Check if URL/content seen before
2. **Cache existence** - Avoid unnecessary cache lookups
3. **Database optimization** - Skip queries for non-existent keys
4. **Spell checking** - Dictionary membership
5. **Network routing** - Packet deduplication

## How It Works

### Optimal Parameters

Given capacity n and error rate p:
- Bit size: `m = -n * ln(p) / (ln(2)²)`
- Hash count: `k = (m/n) * ln(2)`

### Kirsch-Mitzenmacher Technique

Instead of computing k independent hashes, we compute one 128-bit hash and derive k values:

```typescript
const [h1, h2] = hash128(item);  // Split 128-bit hash
for (let i = 0; i < k; i++) {
  const index = (h1 + i * h2) % size;
  // Use index...
}
```

This provides the same theoretical guarantees as independent hashes with a single hash call.

## Limitations

- **No deletions** - Items cannot be removed (use counting Bloom filter for that)
- **Fixed size** - Capacity must be determined upfront
- **False positives** - May report items as present when they're not (but never false negatives)

## License

MIT
