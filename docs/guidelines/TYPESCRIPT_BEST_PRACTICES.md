central-analytics/docs/TYPESCRIPT_BEST_PRACTICES.md
# TypeScript Best Practices for Central Analytics

This document outlines TypeScript best practices specifically tailored for the Central Analytics project. It builds on the project's CLAUDE.md requirement to "never use any, always create the appropriate type."

## Table of Contents
1. [Avoiding 'any' Types](#avoiding-any-types)
2. [Strict TypeScript Configuration](#strict-typescript-configuration)
3. [Type Definition Patterns](#type-definition-patterns)
4. [Generics and Constraints](#generics-and-constraints)
5. [Error Handling Types](#error-handling-types)
6. [Performance Considerations](#performance-considerations)
7. [Common Patterns in This Project](#common-patterns-in-this-project)
8. [Tooling and Enforcement](#tooling-and-enforcement)

## Avoiding 'any' Types

Per CLAUDE.md, we never use `any`. Here's how to eliminate it:

### ❌ Bad: Using 'any'
```typescript
interface DashboardProps {
  user?: any;  // Never do this
}
```

### ✅ Good: Define Specific Types
```typescript
import type { User } from '@/stores/authStore';

interface DashboardProps {
  user?: User;  // Specific type
}
```

### For External Libraries
When dealing with third-party libraries that use `any`, create wrapper interfaces:

```typescript
// Bad
const chartOptions: any = { /* ... */ };

// Good
interface ChartConfig {
  theme: string;
  responsive: boolean;
  [key: string]: unknown;  // Only use as last resort with justification
}

const chartOptions: ChartConfig = { /* ... */ };
```

## Strict TypeScript Configuration

Our `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Type Definition Patterns

### Interface vs Type Alias

Use interfaces for object shapes, type aliases for unions/primitives:

```typescript
// Interface for objects
interface User {
  id: string;
  name: string;
  email: string;
}

// Type alias for unions
type Theme = 'light' | 'dark' | 'system';

// Type alias for complex types
type MetricData = {
  [timestamp: string]: number;
};
```

### Discriminated Unions

Use discriminated unions for type-safe conditionals:

```typescript
type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }
  | { status: 'loading' };

function handleResponse<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case 'success':
      // response.data is available and typed as T
      break;
    case 'error':
      // response.message is available
      break;
    case 'loading':
      // No additional properties
      break;
  }
}
```

## Generics and Constraints

### Constrained Generics

Instead of defaulting to `any`, use constraints:

```typescript
// Bad
function useChartData<T = any>(options: UseChartDataOptions<T>)

// Good
function useChartData<T extends Record<string, unknown>>(
  options: UseChartDataOptions<T>
)
```

### Generic Utilities

Create reusable generic types:

```typescript
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type ApiEndpoint<TData, TParams = Record<string, unknown>> = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: TParams;
  transformResponse: (data: unknown) => TData;
};
```

## Error Handling Types

Create typed error handling:

```typescript
// Custom error types
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Result type for operations that might fail
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const response = await apiGet<User>(`/users/${id}`);
    return { success: true, data: response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}
```

## Performance Considerations

### Avoid Excessive Generic Instantiations

```typescript
// Bad: Generic used unnecessarily
function identity<T>(value: T): T {
  return value;
}

// Good: If type is known, avoid generic
function stringIdentity(value: string): string {
  return value;
}
```

### Lazy Type Evaluation

Use conditional types for performance:

```typescript
type ExtractKeys<T, U> = T extends Record<string, infer V>
  ? U extends V
    ? keyof T
    : never
  : never;
```

### Type-Only Imports

Use `import type` for types to avoid runtime overhead:

```typescript
// Bad: Both type and runtime import
import { User } from './types';

// Good: Only type
import type { User } from './types';

// Mixed
import type { User, ApiResponse } from './types';
import { fetchUser } from './api';
```

## Common Patterns in This Project

### Chart Data Types

```typescript
// Base chart data interface
interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

// Specific chart types
interface LambdaMetrics {
  invocations: number;
  duration: number;
  errors: number;
  timestamp: number;
}

interface RevenueData extends ChartDataPoint {
  revenue: number;
  transactions: number;
  arpu: number;
}
```

### Component Props Types

```typescript
// Component props with constrained generics
interface ChartProps<T extends ChartDataPoint> {
  data: T[];
  height?: number;
  width?: number;
  onPointClick?: (point: T) => void;
}

// Usage
const LambdaChart = <ChartProps<LambdaMetrics>>((props) => { /* ... */ });
```

### Store Types

```typescript
// Zustand store state types
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricAvailable: boolean;
}

// Action types
interface AuthActions {
  signInWithApple: () => Promise<void>;
  signOut: () => void;
  setError: (error: string | null) => void;
}
```

## Tooling and Enforcement

### ESLint Configuration

Create `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['@typescript-eslint/recommended', 'react', 'react-hooks'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/prefer-interface': 'off', // We use both appropriately
  },
};
```

### Pre-commit Hooks

Use Husky for pre-commit type checking:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "tsc --noEmit && eslint src/**/*.ts src/**/*.tsx"
    }
  }
}
```

### IDE Configuration

VS Code settings for the workspace:

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

## Migration Strategy

1. **Audit Current Usage**: Search for `any` usage with:
   ```bash
   grep -r ": any" src/
   grep -r "<any>" src/
   ```

2. **Replace Gradually**: Start with components, then utilities, then stores

3. **Test Thoroughly**: Use `--strict` mode to catch issues early

4. **Update Tests**: Ensure type safety in test files

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

## Examples from Our Codebase

See the recent updates to:
- `src/components/Dashboard.tsx` - Replaced `user?: any` with `User` type
- `src/hooks/useChartData.ts` - Added generics constraints
- `src/components/ErrorBoundary.tsx` - Proper error type handling