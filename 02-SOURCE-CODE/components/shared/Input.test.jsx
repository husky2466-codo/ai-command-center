import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';
import { Search } from 'lucide-react';

describe('Input Component', () => {
  it('renders text input', () => {
    render(<Input label="Email" placeholder="Enter email" />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('handles text input', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(<Input label="Name" onChange={handleChange} />);

    const input = screen.getByLabelText('Name');
    await user.type(input, 'John Doe');

    expect(input).toHaveValue('John Doe');
    expect(handleChange).toHaveBeenCalledTimes(8); // One per character
  });

  it('displays error message when error prop is set', () => {
    render(<Input label="Email" error="Invalid email address" />);

    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
  });

  it('applies has-error class to container when error prop is set', () => {
    const { container } = render(<Input label="Email" error="Invalid email" />);

    const inputContainer = container.querySelector('.input-container');
    expect(inputContainer).toHaveClass('input-has-error');
  });

  it('displays hint text', () => {
    render(<Input label="Password" hint="Must be at least 8 characters" />);

    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <Input
        label="Search"
        icon={<Search data-testid="search-icon" />}
      />
    );

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('applies icon classes when icons are present', () => {
    const { container } = render(
      <Input
        label="Search"
        icon={<Search />}
      />
    );

    const input = screen.getByLabelText('Search');
    expect(input).toHaveClass('input-has-icon-left');
  });

  it('renders with right icon', () => {
    const { container } = render(
      <Input
        label="Search"
        iconRight={<Search data-testid="search-icon-right" />}
      />
    );

    expect(screen.getByTestId('search-icon-right')).toBeInTheDocument();
    const input = screen.getByLabelText('Search');
    expect(input).toHaveClass('input-has-icon-right');
  });

  it('sets required attribute when required prop is true', () => {
    render(<Input label="Email" required />);

    const input = screen.getByLabelText('Email *');
    expect(input).toBeRequired();
  });

  it('disables input when disabled prop is true', () => {
    render(<Input label="Email" disabled />);

    const input = screen.getByLabelText('Email');
    expect(input).toBeDisabled();
  });

  it('applies fullWidth class when fullWidth is true', () => {
    const { container } = render(<Input label="Email" fullWidth />);

    const inputContainer = container.querySelector('.input-container');
    expect(inputContainer).toHaveClass('input-full-width');
  });

  it('renders different input types', () => {
    const { rerender } = render(<Input label="Field" type="email" />);
    expect(screen.getByLabelText('Field')).toHaveAttribute('type', 'email');

    rerender(<Input label="Field" type="password" />);
    expect(screen.getByLabelText('Field')).toHaveAttribute('type', 'password');

    rerender(<Input label="Field" type="number" />);
    expect(screen.getByLabelText('Field')).toHaveAttribute('type', 'number');
  });

  it('passes through additional props', () => {
    render(
      <Input
        label="Email"
        data-testid="email-input"
        maxLength={50}
        autoComplete="email"
      />
    );

    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('maxLength', '50');
    expect(input).toHaveAttribute('autoComplete', 'email');
  });

  it('renders without label when label prop is not provided', () => {
    render(<Input placeholder="Enter text" />);

    expect(screen.queryByRole('label')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Input label="Email" className="custom-input" />);

    const input = container.querySelector('.custom-input');
    expect(input).toBeInTheDocument();
  });

  it('handles controlled input', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const [value, setValue] = React.useState('');

      return (
        <Input
          label="Controlled"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      );
    };

    render(<TestComponent />);

    const input = screen.getByLabelText('Controlled');
    expect(input).toHaveValue('');

    await user.type(input, 'test');
    expect(input).toHaveValue('test');
  });

  it('shows error but not hint when both are provided', () => {
    render(
      <Input
        label="Email"
        error="Invalid email"
        hint="Enter your email address"
      />
    );

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
  });

  it('sets aria-invalid to true when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-describedby when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);

    const input = screen.getByLabelText('Email');
    const errorId = input.getAttribute('aria-describedby');

    expect(errorId).toMatch(/-error$/);
    expect(screen.getByText('Invalid email')).toHaveAttribute('id', errorId);
  });

  it('sets aria-describedby when hint is present', () => {
    render(<Input label="Email" hint="Enter your email" />);

    const input = screen.getByLabelText('Email');
    const hintId = input.getAttribute('aria-describedby');

    expect(hintId).toMatch(/-hint$/);
    expect(screen.getByText('Enter your email')).toHaveAttribute('id', hintId);
  });

  it('focuses input when clicking label', async () => {
    const user = userEvent.setup();

    render(<Input label="Email" />);

    const label = screen.getByText('Email');
    const input = screen.getByLabelText('Email');

    await user.click(label);
    expect(input).toHaveFocus();
  });
});
