import { hash128x64 } from 'murmur-hash';
import { calculateOptimalParams } from './optimal.js';

export interface BloomSiftOptions {
  /** Expected number of items */
  capacity: number;
  /** Desired false positive rate (0 < errorRate < 1) */
  errorRate: number;
}

export interface SerializedBloomSift {
  /** Bit array as base64 string */
  bits: string;
  /** Number of bits in the filter */
  size: number;
  /** Number of hash functions (k) */
  hashCount: number;
  /** Approximate number of items added */
  count: number;
}

/**
 * A space-efficient probabilistic data structure for set membership testing.
 * Uses 128-bit MurmurHash3 with Kirsch-Mitzenmacher double hashing technique.
 *
 * @example
 * ```typescript
 * const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });
 * filter.add('hello');
 * filter.has('hello'); // true
 * filter.has('world'); // false (probably)
 * ```
 */
export class BloomSift {
  private readonly bits: Uint8Array;
  private readonly _size: number;
  private readonly _hashCount: number;
  private readonly _capacity: number;
  private _count: number;

  /**
   * Creates a new Bloom filter with optimal parameters.
   * @param options - Configuration options
   * @param options.capacity - Expected number of items to store
   * @param options.errorRate - Desired false positive rate (0 < errorRate < 1)
   * @throws {Error} If capacity is not positive
   * @throws {Error} If errorRate is not between 0 and 1
   */
  constructor(options: BloomSiftOptions) {
    const { capacity, errorRate } = options;

    if (capacity <= 0) {
      throw new Error('capacity must be positive');
    }
    if (errorRate <= 0 || errorRate >= 1) {
      throw new Error('errorRate must be between 0 and 1');
    }

    const { size, hashCount } = calculateOptimalParams(capacity, errorRate);
    this._size = size;
    this._hashCount = hashCount;
    this._capacity = capacity;
    this.bits = new Uint8Array(Math.ceil(size / 8));
    this._count = 0;
  }

  /** Number of bits in the filter */
  get size(): number {
    return this._size;
  }

  /** Number of hash functions (k) */
  get hashCount(): number {
    return this._hashCount;
  }

  /** Approximate number of items added */
  get count(): number {
    return this._count;
  }

  /** Estimated fill ratio (0 to 1). Approaches 1 as filter saturates. */
  get fillRatio(): number {
    return Math.min(1, this._count / this._capacity);
  }

  /**
   * Adds an item to the filter.
   * @param item - The item to add (string or binary data)
   */
  add(item: string | Uint8Array): void {
    const [h1, h2] = this.hash128(item);
    const size = BigInt(this._size);

    for (let i = 0; i < this._hashCount; i++) {
      const index = Number((h1 + BigInt(i) * h2) % size);
      this.setBit(index);
    }
    this._count++;
  }

  /**
   * Checks if an item might be in the filter.
   * @param item - The item to check (string or binary data)
   * @returns `true` if item might be present, `false` if definitely not present
   */
  has(item: string | Uint8Array): boolean {
    const [h1, h2] = this.hash128(item);
    const size = BigInt(this._size);

    for (let i = 0; i < this._hashCount; i++) {
      const index = Number((h1 + BigInt(i) * h2) % size);
      if (!this.getBit(index)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Resets the filter to empty state.
   */
  clear(): void {
    this.bits.fill(0);
    this._count = 0;
  }

  /**
   * Serializes the filter to a JSON-friendly format for storage or transfer.
   * @returns Serialized filter data with base64-encoded bits
   */
  serialize(): SerializedBloomSift {
    // Convert Uint8Array to base64 (browser + Node compatible)
    const binaryString = Array.from(this.bits, (byte) => String.fromCharCode(byte)).join('');
    const bits = btoa(binaryString);

    return {
      bits,
      size: this._size,
      hashCount: this._hashCount,
      count: this._count,
    };
  }

  /**
   * Restores a filter from serialized data.
   * @param data - Previously serialized filter data
   * @returns A new BloomSift instance with restored state
   * @throws {Error} If serialized data is invalid or corrupted
   */
  static deserialize(data: SerializedBloomSift): BloomSift {
    // Validate input
    if (!data || typeof data.bits !== 'string') {
      throw new Error('Invalid serialized data: missing bits');
    }
    if (data.size <= 0 || !Number.isInteger(data.size)) {
      throw new Error('Invalid serialized data: size must be a positive integer');
    }
    if (data.hashCount <= 0 || !Number.isInteger(data.hashCount)) {
      throw new Error('Invalid serialized data: hashCount must be a positive integer');
    }
    if (data.count < 0 || !Number.isInteger(data.count)) {
      throw new Error('Invalid serialized data: count must be a non-negative integer');
    }

    // Decode base64 to Uint8Array (browser + Node compatible)
    const binaryString = atob(data.bits);
    const bits = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

    // Validate bit array size
    const expectedBytes = Math.ceil(data.size / 8);
    if (bits.length !== expectedBytes) {
      throw new Error(
        `Invalid serialized data: expected ${expectedBytes} bytes, got ${bits.length}`
      );
    }

    // Create instance with direct assignment
    const instance = new BloomSift({ capacity: 1, errorRate: 0.5 });
    const raw = instance as unknown as {
      bits: Uint8Array;
      _size: number;
      _hashCount: number;
      _capacity: number;
      _count: number;
    };
    raw.bits = bits;
    raw._size = data.size;
    raw._hashCount = data.hashCount;
    raw._capacity = data.count || 1;
    raw._count = data.count;

    return instance;
  }

  /**
   * Get 128-bit hash split into two 64-bit values
   */
  private hash128(item: string | Uint8Array): [bigint, bigint] {
    const hash = hash128x64(item, { output: 'bigint' }) as bigint;
    const mask64 = (1n << 64n) - 1n;
    const h1 = hash >> 64n;
    const h2 = hash & mask64;
    return [h1, h2];
  }

  private setBit(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    const current = this.bits[byteIndex];
    if (current !== undefined) {
      this.bits[byteIndex] = current | (1 << bitIndex);
    }
  }

  private getBit(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    const byte = this.bits[byteIndex];
    return byte !== undefined && (byte & (1 << bitIndex)) !== 0;
  }
}

export { calculateOptimalParams } from './optimal.js';
