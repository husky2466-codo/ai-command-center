import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';
import { Loader2, Plus } from 'lucide-react';

describe('Button Component', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-md');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('disables button when loading', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    // Attempt to click - should not trigger handler
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders left icon when provided', () => {
    render(<Button icon={<Plus data-testid="plus-icon" />}>Add Item</Button>);
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('renders right icon when provided', () => {
    render(<Button iconRight={<Plus data-testid="plus-icon" />}>Next</Button>);
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('hides icons when loading', () => {
    render(
      <Button
        loading
        icon={<Plus data-testid="left-icon" />}
        iconRight={<Plus data-testid="right-icon" />}
      >
        Loading
      </Button>
    );

    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
  });

  it('applies fullWidth class when fullWidth is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-full-width');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('renders with correct button type', () => {
    const { rerender } = render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

    rerender(<Button type="reset">Reset</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');

    rerender(<Button type="button">Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('defaults to type="button"', () => {
    render(<Button>Default Type</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('passes through additional props', () => {
    render(<Button data-testid="custom-button" aria-label="Custom Label">Test</Button>);
    const button = screen.getByTestId('custom-button');

    expect(button).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('renders button without children (icon only)', () => {
    render(<Button icon={<Plus data-testid="plus-icon" />} aria-label="Add" />);
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    expect(screen.getByLabelText('Add')).toBeInTheDocument();
  });
});
