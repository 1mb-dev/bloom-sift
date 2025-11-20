# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-20

### Added
- `capacity` field to `SerializedBloomSift` interface for proper fillRatio preservation
- Validation for `capacity` in deserialize method
- Test for invalid capacity deserialization

### Changed
- **BREAKING**: Serialization format now includes `capacity` field
- `deserialize()` now properly restores original capacity and fillRatio

## [0.1.0] - 2025-11-20

### Added

- Initial release
- `BloomSift` class with optimal parameter calculation
- 128-bit MurmurHash3 with Kirsch-Mitzenmacher double hashing technique
- `add()` and `has()` methods for string and Uint8Array inputs
- `serialize()` and `deserialize()` for persistence with input validation
- `clear()` method and `fillRatio` property
- `count`, `size`, and `hashCount` properties
- Browser-compatible base64 encoding (btoa/atob)
- Comprehensive test suite with 33 tests
- TypeScript support with full type definitions
- ESM and CommonJS dual build support
- GitHub Actions CI with Node 20.x and 22.x
