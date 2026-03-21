import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RenameListDialog } from '../../../components/dialogs/RenameListDialog'

function renderDialog(currentName = 'Old Name', onConfirm = vi.fn(), onClose = vi.fn()) {
  return render(
    <RenameListDialog currentName={currentName} onConfirm={onConfirm} onClose={onClose} />,
  )
}

describe('RenameListDialog', () => {
  it('renders the dialog with Rename List title', () => {
    renderDialog()
    expect(screen.getByText('Rename List')).toBeInTheDocument()
  })

  it('pre-fills input with current name', () => {
    renderDialog('Old Name')
    expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument()
  })

  it('shows validation error when submitting empty name via Enter', async () => {
    const user = userEvent.setup()
    renderDialog()
    const input = screen.getByDisplayValue('Old Name')
    await user.clear(input)
    await user.keyboard('{Enter}')
    expect(screen.getByText('List name cannot be empty.')).toBeInTheDocument()
  })

  it('calls onConfirm with trimmed new name', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog('Old', onConfirm)
    const input = screen.getByDisplayValue('Old')
    await user.clear(input)
    await user.type(input, '  New Name  ')
    await user.click(screen.getByText('Save'))
    expect(onConfirm).toHaveBeenCalledWith('New Name')
  })

  it('calls onClose after successful rename', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<RenameListDialog currentName="Old" onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByText('Save'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error when onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('fail'))
    const user = userEvent.setup()
    renderDialog('Old', onConfirm)
    await user.click(screen.getByText('Save'))
    expect(screen.getByText('Failed to rename list. Please try again.')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog('Name', vi.fn(), onClose)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('submits on Enter key', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog('Old', onConfirm)
    const input = screen.getByDisplayValue('Old')
    await user.clear(input)
    await user.type(input, 'New{Enter}')
    expect(onConfirm).toHaveBeenCalledWith('New')
  })

  it('closes on Escape key', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog('Name', vi.fn(), onClose)
    await user.type(screen.getByDisplayValue('Name'), '{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
