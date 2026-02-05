import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from './Card';

describe('Card Component', () => {
  it('renders with children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );

    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with title and subtitle', () => {
    render(
      <Card title="Card Title" subtitle="Card Subtitle">
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
  });

  it('renders with title only', () => {
    render(
      <Card title="Card Title">
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('renders with subtitle only', () => {
    render(
      <Card subtitle="Card Subtitle">
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
  });

  it('renders custom header when provided', () => {
    const customHeader = <div>Custom Header Content</div>;

    render(
      <Card header={customHeader}>
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Custom Header Content')).toBeInTheDocument();
  });

  it('prefers custom header over title/subtitle', () => {
    const customHeader = <div>Custom Header</div>;

    render(
      <Card header={customHeader} title="Title" subtitle="Subtitle">
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Custom Header')).toBeInTheDocument();
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Subtitle')).not.toBeInTheDocument();
  });

  it('renders actions in footer', () => {
    const actions = (
      <div>
        <button>Action 1</button>
        <button>Action 2</button>
      </div>
    );

    render(
      <Card title="Card" actions={actions}>
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('renders custom footer when provided', () => {
    const customFooter = <div>Custom Footer Content</div>;

    render(
      <Card footer={customFooter}>
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Custom Footer Content')).toBeInTheDocument();
  });

  it('prefers custom footer over actions', () => {
    const customFooter = <div>Custom Footer</div>;
    const actions = <button>Action</button>;

    render(
      <Card footer={customFooter} actions={actions}>
        <p>Content</p>
      </Card>
    );

    expect(screen.getByText('Custom Footer')).toBeInTheDocument();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });

  it('handles click events when onClick is provided', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(
      <Card onClick={handleClick}>
        <p>Clickable card</p>
      </Card>
    );

    const card = screen.getByRole('button');
    await user.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard events when onClick is provided', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(
      <Card onClick={handleClick}>
        <p>Clickable card</p>
      </Card>
    );

    const card = screen.getByRole('button');
    card.focus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('has role="button" and tabIndex when onClick is provided', () => {
    render(
      <Card onClick={() => {}}>
        <p>Clickable card</p>
      </Card>
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('does not have role="button" when onClick is not provided', () => {
    render(
      <Card>
        <p>Regular card</p>
      </Card>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { container, rerender } = render(<Card variant="default">Content</Card>);
    let card = container.querySelector('.card');
    expect(card).toHaveClass('card-default');

    rerender(<Card variant="elevated">Content</Card>);
    card = container.querySelector('.card');
    expect(card).toHaveClass('card-elevated');

    rerender(<Card variant="outlined">Content</Card>);
    card = container.querySelector('.card');
    expect(card).toHaveClass('card-outlined');
  });

  it('applies padding classes correctly', () => {
    const { container, rerender } = render(<Card padding="none">Content</Card>);
    let card = container.querySelector('.card');
    expect(card).toHaveClass('card-padding-none');

    rerender(<Card padding="sm">Content</Card>);
    card = container.querySelector('.card');
    expect(card).toHaveClass('card-padding-sm');

    rerender(<Card padding="md">Content</Card>);
    card = container.querySelector('.card');
    expect(card).toHaveClass('card-padding-md');

    rerender(<Card padding="lg">Content</Card>);
    card = container.querySelector('.card');
    expect(card).toHaveClass('card-padding-lg');
  });

  it('applies hoverable class when hoverable is true', () => {
    const { container } = render(<Card hoverable>Content</Card>);
    const card = container.querySelector('.card');

    expect(card).toHaveClass('card-hoverable');
  });

  it('applies clickable class when onClick is provided', () => {
    const { container } = render(<Card onClick={() => {}}>Content</Card>);
    const card = container.querySelector('.card');

    expect(card).toHaveClass('card-clickable');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-card">Content</Card>);
    const card = container.querySelector('.card');

    expect(card).toHaveClass('custom-card');
  });

  it('renders complex content with all features', () => {
    const handleClick = jest.fn();
    const actions = <button>Action</button>;

    render(
      <Card
        title="Project Card"
        subtitle="Active development"
        actions={actions}
        onClick={handleClick}
        variant="elevated"
        padding="lg"
        hoverable
        className="project-card"
      >
        <div>
          <p>Project description</p>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
          </ul>
        </div>
      </Card>
    );

    expect(screen.getByText('Project Card')).toBeInTheDocument();
    expect(screen.getByText('Active development')).toBeInTheDocument();
    expect(screen.getByText('Project description')).toBeInTheDocument();
    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders without any optional props', () => {
    const { container } = render(
      <Card>
        <p>Minimal card</p>
      </Card>
    );

    expect(screen.getByText('Minimal card')).toBeInTheDocument();
    expect(container.querySelector('.card')).toBeInTheDocument();
  });
});
