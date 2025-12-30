# Testing Guide

## Overview

AI Command Center uses **Jest** and **React Testing Library** for unit and integration testing.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Configuration

- **Jest Config**: `jest.config.js`
- **Setup File**: `src/setupTests.js` (runs before all tests)
- **Babel Config**: `babel.config.js` (transforms JSX/modern JS)

## Writing Tests

### Component Test Example

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders with text', () => {
    render(<MyComponent>Hello</MyComponent>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles clicks', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Shared Components

Examples in:
- `src/components/shared/Button.test.jsx` (53 tests total)
- `src/components/shared/Modal.test.jsx`
- `src/components/shared/Card.test.jsx`

### Mocking Electron APIs

Electron APIs are automatically mocked in `src/setupTests.js`:

```javascript
global.electronAPI = {
  getUserDataPath: jest.fn().mockResolvedValue('/mock/path'),
  getApiKeys: jest.fn().mockResolvedValue({ ANTHROPIC_API_KEY: 'mock-key' }),
  dbQuery: jest.fn().mockResolvedValue([]),
  // ... etc
};
```

To override in a specific test:

```javascript
it('reads user data path', async () => {
  global.electronAPI.getUserDataPath.mockResolvedValueOnce('/custom/path');

  const result = await electronAPI.getUserDataPath();
  expect(result).toBe('/custom/path');
});
```

## Best Practices

### 1. Test User Interactions

Use `@testing-library/user-event` for realistic interactions:

```javascript
const user = userEvent.setup();
await user.click(button);
await user.keyboard('{Enter}');
await user.type(input, 'Hello world');
```

### 2. Query by Role

Prefer semantic queries:

```javascript
// Good
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })

// Avoid
screen.getByTestId('submit-btn')
screen.getByClassName('input-email')
```

### 3. Test Accessibility

Check ARIA attributes:

```javascript
expect(button).toHaveAttribute('aria-busy', 'true');
expect(dialog).toHaveAttribute('aria-modal', 'true');
expect(input).toHaveAttribute('aria-invalid', 'true');
```

### 4. Async Actions

Always use `async/await` with user events:

```javascript
// Good
await user.click(button);
expect(handleClick).toHaveBeenCalled();

// Bad (race condition)
user.click(button);
expect(handleClick).toHaveBeenCalled();
```

### 5. Clean Up Effects

React Testing Library auto-cleans up, but for manual cleanup:

```javascript
afterEach(() => {
  jest.clearAllMocks();
});
```

## Testing Checklist

For each component, test:

- ✅ **Rendering**: Component displays correctly
- ✅ **Props**: Different prop combinations work
- ✅ **User Interactions**: Clicks, typing, keyboard events
- ✅ **State Changes**: Component updates when state changes
- ✅ **Edge Cases**: Empty states, error states, loading states
- ✅ **Accessibility**: Roles, labels, keyboard navigation

## Coverage

View coverage report:

```bash
npm run test:coverage
```

Coverage report is saved to `coverage/` directory. Open `coverage/lcov-report/index.html` in browser for detailed view.

## Common Matchers

```javascript
// Existence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Text
expect(element).toHaveTextContent('Hello');
expect(element).toContainHTML('<span>Hello</span>');

// Attributes
expect(element).toHaveAttribute('type', 'submit');
expect(element).toHaveClass('btn-primary');

// Form elements
expect(input).toHaveValue('test@example.com');
expect(checkbox).toBeChecked();
expect(button).toBeDisabled();

// Visibility
expect(element).toBeVisible();
expect(element).toHaveFocus();

// Mock functions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

## Debugging Tests

### 1. Print DOM

```javascript
import { screen } from '@testing-library/react';

screen.debug(); // Prints entire document
screen.debug(element); // Prints specific element
```

### 2. Pause Execution

```javascript
import { screen } from '@testing-library/react';

await screen.findByRole('button');
// Add breakpoint here in debugger
```

### 3. Run Single Test

```bash
npm test -- Button.test.jsx
npm test -- --testNamePattern="handles click"
```

### 4. Watch Mode

```bash
npm run test:watch
```

Press `p` to filter by filename, `t` to filter by test name.

## CI/CD Integration

Tests run automatically in CI/CD pipelines. Exit code 0 = success, non-zero = failure.

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## Next Steps

Add tests for:
- [ ] Dashboard widgets
- [ ] Project management features
- [ ] Knowledge base components
- [ ] Email components
- [ ] DGX Spark features
- [ ] Service layer (API calls, data transformations)

---

**Happy Testing!** 🚀
