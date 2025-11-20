# Contributing to bloom-sift

Thank you for your interest in contributing to bloom-sift!

## Development Setup

### Prerequisites

- Node.js 20 or higher (see `.nvmrc`)
- npm

### Getting Started

1. Fork and clone the repository
   ```bash
   git clone https://github.com/your-username/bloom-sift.git
   cd bloom-sift
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the project
   ```bash
   npm run build
   ```

4. Run tests
   ```bash
   npm test
   ```

## Development Workflow

### Available Scripts

- `npm run build` - Build ESM and CJS outputs
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint source and test files
- `npm run format` - Format code with Prettier
- `npm run bench` - Run performance benchmarks

### Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code

### Testing

- Write tests for all new features
- Maintain or improve test coverage
- Tests are located in `test/`

## Pull Request Process

1. Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit with clear messages
   ```bash
   git commit -m "Add feature: description of changes"
   ```

3. Ensure all tests pass and lint is clean
   ```bash
   npm run lint && npm test
   ```

4. Push to your fork and create a Pull Request

5. Wait for CI to pass and address any review feedback

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
