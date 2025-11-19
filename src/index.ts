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

export class BloomSift {
  private readonly bits: Uint8Array;
  private readonly _size: number;
  private readonly _hashCount: number;
  private _count: number;

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

  /**
   * Add an item to the filter
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
   * Check if an item might be in the filter
   * @returns true if item might be present, false if definitely not present
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
   * Serialize the filter to a JSON-friendly format
   */
  serialize(): SerializedBloomSift {
    // Convert Uint8Array to base64
    const bits = Buffer.from(this.bits).toString('base64');

    return {
      bits,
      size: this._size,
      hashCount: this._hashCount,
      count: this._count,
    };
  }

  /**
   * Restore a filter from serialized data
   */
  static deserialize(data: SerializedBloomSift): BloomSift {
    // Decode base64 to Uint8Array
    const bits = new Uint8Array(Buffer.from(data.bits, 'base64'));

    // Create instance using internal method
    return BloomSift.fromRaw(bits, data.size, data.hashCount, data.count);
  }

  /**
   * Create a BloomSift instance from raw data (internal use)
   */
  private static fromRaw(
    bits: Uint8Array,
    size: number,
    hashCount: number,
    count: number
  ): BloomSift {
    // Create a minimal instance and override properties
    const instance = Object.create(BloomSift.prototype) as BloomSift;
    Object.defineProperty(instance, 'bits', { value: bits, writable: false });
    Object.defineProperty(instance, '_size', { value: size, writable: false });
    Object.defineProperty(instance, '_hashCount', { value: hashCount, writable: false });
    instance._count = count;
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
