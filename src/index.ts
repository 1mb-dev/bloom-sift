import { hash128x64 } from 'murmur-hash';
import { calculateOptimalParams } from './optimal.js';

export interface BloomSiftOptions {
  /** Expected number of items */
  capacity: number;
  /** Desired false positive rate (0 < errorRate < 1) */
  errorRate: number;
}

export class BloomSift {
  private readonly bits: Uint8Array;
  private readonly _size: number;
  private readonly _hashCount: number;

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
  }

  /** Number of bits in the filter */
  get size(): number {
    return this._size;
  }

  /** Number of hash functions (k) */
  get hashCount(): number {
    return this._hashCount;
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
