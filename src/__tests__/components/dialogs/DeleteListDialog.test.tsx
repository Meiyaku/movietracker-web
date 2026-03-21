import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteListDialog } from '../../../components/dialogs/DeleteListDialog'

function renderDialog(listName = 'Watchlist', onConfirm = vi.fn(), onClose = vi.fn()) {
  return render(<DeleteListDialog listName={listName} onConfirm={onConfirm} onClose={onClose} />)
}

describe('DeleteListDialog', () => {
  it('renders the Delete List title', () => {
    renderDialog()
    expect(screen.getByText('Delete List')).toBeInTheDocument()
  })

  it('shows the list name in the confirmation message', () => {
    renderDialog('My Watchlist')
    expect(screen.getByText(/"My Watchlist"/)).toBeInTheDocument()
  })

  it('explains movies will not be deleted', () => {
    renderDialog()
    expect(screen.getByText(/will not delete the movies themselves/)).toBeInTheDocument()
  })

  it('calls onConfirm when Delete button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog('List', onConfirm)
    await user.click(screen.getByText('Delete'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onClose after successful deletion', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<DeleteListDialog listName="List" onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByText('Delete'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error message when onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('fail'))
    const user = userEvent.setup()
    renderDialog('List', onConfirm)
    await user.click(screen.getByText('Delete'))
    expect(screen.getByText('Failed to delete list. Please try again.')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog('List', vi.fn(), onClose)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose if onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('fail'))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<DeleteListDialog listName="List" onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByText('Delete'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
