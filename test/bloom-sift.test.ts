import { describe, it, expect } from 'vitest';
import { BloomSift, calculateOptimalParams } from '../src/index.js';

describe('calculateOptimalParams', () => {
  it('should calculate correct parameters for capacity=1000, errorRate=0.01', () => {
    const { size, hashCount } = calculateOptimalParams(1000, 0.01);

    // Expected: m = -1000 * ln(0.01) / (ln(2)^2) ≈ 9586
    // Expected: k = (9586/1000) * ln(2) ≈ 6.64 → 7
    expect(size).toBe(9586);
    expect(hashCount).toBe(7);
  });

  it('should calculate correct parameters for capacity=100, errorRate=0.001', () => {
    const { size, hashCount } = calculateOptimalParams(100, 0.001);

    // Expected: m ≈ 1438, k ≈ 10
    expect(size).toBe(1438);
    expect(hashCount).toBe(10);
  });

  it('should scale linearly with capacity', () => {
    const small = calculateOptimalParams(100, 0.01);
    const large = calculateOptimalParams(1000, 0.01);

    // Size should scale ~10x
    expect(large.size).toBeCloseTo(small.size * 10, -1);
    // Hash count should be the same
    expect(large.hashCount).toBe(small.hashCount);
  });
});

describe('BloomSift', () => {
  describe('constructor', () => {
    it('should create filter with correct properties', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      expect(filter.size).toBe(9586);
      expect(filter.hashCount).toBe(7);
      expect(filter.count).toBe(0);
    });

    it('should reject non-positive capacity', () => {
      expect(() => new BloomSift({ capacity: 0, errorRate: 0.01 }))
        .toThrow('capacity must be positive');
      expect(() => new BloomSift({ capacity: -1, errorRate: 0.01 }))
        .toThrow('capacity must be positive');
    });

    it('should reject invalid errorRate', () => {
      expect(() => new BloomSift({ capacity: 1000, errorRate: 0 }))
        .toThrow('errorRate must be between 0 and 1');
      expect(() => new BloomSift({ capacity: 1000, errorRate: 1 }))
        .toThrow('errorRate must be between 0 and 1');
      expect(() => new BloomSift({ capacity: 1000, errorRate: -0.1 }))
        .toThrow('errorRate must be between 0 and 1');
      expect(() => new BloomSift({ capacity: 1000, errorRate: 1.5 }))
        .toThrow('errorRate must be between 0 and 1');
    });
  });

  describe('add/has with strings', () => {
    it('should find added strings', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      filter.add('hello');
      filter.add('world');
      filter.add('test');

      expect(filter.has('hello')).toBe(true);
      expect(filter.has('world')).toBe(true);
      expect(filter.has('test')).toBe(true);
    });

    it('should handle empty string', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      filter.add('');
      expect(filter.has('')).toBe(true);
    });

    it('should handle unicode strings', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      filter.add('こんにちは');
      filter.add('🎉');

      expect(filter.has('こんにちは')).toBe(true);
      expect(filter.has('🎉')).toBe(true);
    });
  });

  describe('add/has with Uint8Array', () => {
    it('should find added binary data', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      const data1 = new Uint8Array([1, 2, 3, 4, 5]);
      const data2 = new Uint8Array([255, 0, 128]);

      filter.add(data1);
      filter.add(data2);

      expect(filter.has(data1)).toBe(true);
      expect(filter.has(data2)).toBe(true);
      expect(filter.has(new Uint8Array([1, 2, 3, 4, 5]))).toBe(true);
    });

    it('should handle empty Uint8Array', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      filter.add(new Uint8Array([]));
      expect(filter.has(new Uint8Array([]))).toBe(true);
    });
  });

  describe('count property', () => {
    it('should track number of items added', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      expect(filter.count).toBe(0);

      filter.add('one');
      expect(filter.count).toBe(1);

      filter.add('two');
      expect(filter.count).toBe(2);

      filter.add('three');
      expect(filter.count).toBe(3);
    });

    it('should increment even for duplicate items', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      filter.add('same');
      filter.add('same');
      filter.add('same');

      expect(filter.count).toBe(3);
    });
  });

  describe('true negatives', () => {
    it('should return false for non-added items', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      filter.add('hello');
      filter.add('world');

      expect(filter.has('foo')).toBe(false);
      expect(filter.has('bar')).toBe(false);
      expect(filter.has('baz')).toBe(false);
    });

    it('should return false for empty filter', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      expect(filter.has('anything')).toBe(false);
      expect(filter.has('')).toBe(false);
      expect(filter.has(new Uint8Array([1, 2, 3]))).toBe(false);
    });
  });

  describe('false positive rate', () => {
    it('should maintain expected false positive rate', () => {
      const errorRate = 0.01;
      const capacity = 1000;
      const filter = new BloomSift({ capacity, errorRate });

      // Add capacity items
      for (let i = 0; i < capacity; i++) {
        filter.add(`item-${i}`);
      }

      // Test non-added items
      const testCount = 10000;
      let falsePositives = 0;

      for (let i = 0; i < testCount; i++) {
        if (filter.has(`non-existent-${i}`)) {
          falsePositives++;
        }
      }

      const actualRate = falsePositives / testCount;

      // Allow 2x margin for statistical variance
      expect(actualRate).toBeLessThan(errorRate * 2);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON-friendly format', () => {
      const filter = new BloomSift({ capacity: 100, errorRate: 0.01 });
      filter.add('test');

      const data = filter.serialize();

      expect(typeof data.bits).toBe('string');
      expect(typeof data.size).toBe('number');
      expect(typeof data.hashCount).toBe('number');
      expect(typeof data.count).toBe('number');

      // Verify it's valid JSON
      expect(() => JSON.stringify(data)).not.toThrow();
    });

    it('should preserve filter state through round-trip', () => {
      const filter = new BloomSift({ capacity: 1000, errorRate: 0.01 });

      const items = ['hello', 'world', 'test', 'bloom', 'filter'];
      items.forEach(item => filter.add(item));

      const serialized = filter.serialize();
      const restored = BloomSift.deserialize(serialized);

      // Verify properties
      expect(restored.size).toBe(filter.size);
      expect(restored.hashCount).toBe(filter.hashCount);
      expect(restored.count).toBe(filter.count);

      // Verify all items are found
      items.forEach(item => {
        expect(restored.has(item)).toBe(true);
      });

      // Verify non-added items still not found
      expect(restored.has('not-added')).toBe(false);
    });

    it('should preserve binary data through round-trip', () => {
      const filter = new BloomSift({ capacity: 100, errorRate: 0.01 });

      const data = new Uint8Array([1, 2, 3, 4, 5]);
      filter.add(data);

      const restored = BloomSift.deserialize(filter.serialize());

      expect(restored.has(data)).toBe(true);
      expect(restored.has(new Uint8Array([1, 2, 3, 4, 5]))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should work with single item', () => {
      const filter = new BloomSift({ capacity: 1, errorRate: 0.01 });

      filter.add('only-one');

      expect(filter.has('only-one')).toBe(true);
      expect(filter.count).toBe(1);
    });

    it('should handle large number of items', () => {
      const filter = new BloomSift({ capacity: 10000, errorRate: 0.01 });

      for (let i = 0; i < 10000; i++) {
        filter.add(`item-${i}`);
      }

      // Spot check some items
      expect(filter.has('item-0')).toBe(true);
      expect(filter.has('item-5000')).toBe(true);
      expect(filter.has('item-9999')).toBe(true);
      expect(filter.count).toBe(10000);
    });

    it('should handle very low error rate', () => {
      const filter = new BloomSift({ capacity: 100, errorRate: 0.0001 });

      expect(filter.hashCount).toBeGreaterThan(10);

      filter.add('test');
      expect(filter.has('test')).toBe(true);
    });
  });
});
