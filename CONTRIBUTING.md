# Contributing

Thanks for your interest in Ecommerce Toolkit!

## Development

```bash
git clone https://github.com/RbMo7/ecommerce-toolkit
cd ecommerce-toolkit
npm install
npm run build
```

## Adding a new package

1. Create `packages/<name>/` with `package.json` and `tsconfig.json`
2. Implement your library in `src/index.ts`
3. Add tests using Vitest in `src/index.test.ts`
4. Create `README.md` with usage and business value
5. Update root `README.md` package table

## Standards

- Strict TypeScript — no `any`, no `@ts-ignore`
- Tests for all public API functions
- Zero external dependencies unless essential
- Each package < 500 lines of core logic
- CLI tools use descriptive error messages and exit codes
