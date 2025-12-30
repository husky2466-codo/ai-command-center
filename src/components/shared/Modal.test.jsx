import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Modal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when ESC key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Modal {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on ESC when closeOnEsc is false', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Modal {...defaultProps} onClose={onClose} closeOnEsc={false} />);

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Modal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByRole('presentation');
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside modal content', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Modal {...defaultProps} onClose={onClose} />);

    const modalContent = screen.getByText('Modal content');
    await user.click(modalContent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on backdrop click when closeOnBackdrop is false', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Modal {...defaultProps} onClose={onClose} closeOnBackdrop={false} />);

    const backdrop = screen.getByRole('presentation');
    await user.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('hides close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);

    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Modal {...defaultProps} size="small" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-small');

    rerender(<Modal {...defaultProps} size="medium" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-medium');

    rerender(<Modal {...defaultProps} size="large" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-large');

    rerender(<Modal {...defaultProps} size="fullscreen" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-fullscreen');
  });

  it('renders footer when provided', () => {
    const footer = (
      <div>
        <button>Cancel</button>
        <button>Save</button>
      </div>
    );

    render(<Modal {...defaultProps} footer={footer} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders without title', () => {
    render(<Modal {...defaultProps} title={undefined} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal" />);

    expect(screen.getByRole('dialog')).toHaveClass('custom-modal');
  });

  it('sets aria-modal and aria-labelledby attributes', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('does not set aria-labelledby when no title is provided', () => {
    render(<Modal {...defaultProps} title={undefined} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('prevents body scrolling when open', () => {
    const { unmount } = render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('renders with complex content', () => {
    const complexContent = (
      <div>
        <h3>Section Title</h3>
        <p>Paragraph text</p>
        <input type="text" placeholder="Enter value" />
        <button>Submit</button>
      </div>
    );

    render(<Modal {...defaultProps}>{complexContent}</Modal>);

    expect(screen.getByText('Section Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });
});
