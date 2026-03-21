import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateListDialog } from '../../../components/dialogs/CreateListDialog'

function renderDialog(onConfirm = vi.fn(), onClose = vi.fn()) {
  return render(<CreateListDialog onConfirm={onConfirm} onClose={onClose} />)
}

describe('CreateListDialog', () => {
  it('renders the dialog with a title', () => {
    renderDialog()
    expect(screen.getByText('New List')).toBeInTheDocument()
  })

  it('renders name input and Cancel/Create buttons', () => {
    renderDialog()
    expect(screen.getByPlaceholderText('List name')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
  })

  it('shows validation error when submitting empty name via Enter', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByPlaceholderText('List name'))
    await user.keyboard('{Enter}')
    expect(screen.getByText('List name cannot be empty.')).toBeInTheDocument()
  })

  it('calls onConfirm with trimmed name on submit', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(onConfirm)
    await user.type(screen.getByPlaceholderText('List name'), '  Favorites  ')
    await user.click(screen.getByText('Create'))
    expect(onConfirm).toHaveBeenCalledWith('Favorites')
  })

  it('calls onClose after successful creation', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<CreateListDialog onConfirm={onConfirm} onClose={onClose} />)
    await user.type(screen.getByPlaceholderText('List name'), 'My List')
    await user.click(screen.getByText('Create'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error message when onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    renderDialog(onConfirm)
    await user.type(screen.getByPlaceholderText('List name'), 'Test')
    await user.click(screen.getByText('Create'))
    expect(screen.getByText('Failed to create list. Please try again.')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog(vi.fn(), onClose)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('submits on Enter key press', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(onConfirm)
    await user.type(screen.getByPlaceholderText('List name'), 'Watchlist{Enter}')
    expect(onConfirm).toHaveBeenCalledWith('Watchlist')
  })

  it('closes on Escape key press', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog(vi.fn(), onClose)
    await user.type(screen.getByPlaceholderText('List name'), '{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('Create button is disabled when input is empty', () => {
    renderDialog()
    expect(screen.getByText('Create')).toBeDisabled()
  })

  it('Create button is enabled when input has text', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByPlaceholderText('List name'), 'Hello')
    expect(screen.getByText('Create')).not.toBeDisabled()
  })
})
