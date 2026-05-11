import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditListDialog } from '../../../components/dialogs/EditListDialog'
import { MovieList } from '../../../types'

function makeList(overrides: Partial<MovieList> = {}): MovieList {
  return {
    id: 'list-1',
    name: 'Action',
    subtitle: undefined,
    description: undefined,
    createdAt: new Date(),
    ...overrides,
  }
}

function renderDialog(
  list: MovieList = makeList(),
  onConfirm = vi.fn(),
  onClose = vi.fn(),
) {
  return render(<EditListDialog list={list} onConfirm={onConfirm} onClose={onClose} />)
}

describe('EditListDialog', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the Edit List title', () => {
    renderDialog()
    expect(screen.getByText('Edit List')).toBeInTheDocument()
  })

  it('renders name, subtitle, and description inputs', () => {
    renderDialog()
    expect(screen.getByPlaceholderText('List name')).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText('Optional')).toHaveLength(2)
  })

  it('renders Cancel and Save buttons', () => {
    renderDialog()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  // ── Pre-filling ────────────────────────────────────────────────────────────

  it('pre-fills name input with current list name', () => {
    renderDialog(makeList({ name: 'Drama' }))
    expect(screen.getByDisplayValue('Drama')).toBeInTheDocument()
  })

  it('pre-fills subtitle input when list has a subtitle', () => {
    renderDialog(makeList({ subtitle: 'Best picks' }))
    expect(screen.getByDisplayValue('Best picks')).toBeInTheDocument()
  })

  it('pre-fills description textarea when list has a description', () => {
    renderDialog(makeList({ description: 'My favourite dramas' }))
    expect(screen.getByDisplayValue('My favourite dramas')).toBeInTheDocument()
  })

  it('leaves subtitle empty when list has no subtitle', () => {
    renderDialog(makeList({ subtitle: undefined }))
    const inputs = screen.getAllByPlaceholderText('Optional')
    expect((inputs[0] as HTMLInputElement).value).toBe('')
  })

  // ── Name-only submission ───────────────────────────────────────────────────

  it('calls onConfirm with trimmed name and undefined subtitle/description when fields are blank', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(makeList({ name: 'Action' }), onConfirm)
    await user.click(screen.getByText('Save'))
    expect(onConfirm).toHaveBeenCalledWith('Action', undefined, undefined)
  })

  it('trims whitespace from name before calling onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(makeList({ name: '  Drama  ' }), onConfirm)
    await user.click(screen.getByText('Save'))
    expect(onConfirm).toHaveBeenCalledWith('Drama', undefined, undefined)
  })

  // ── Subtitle & description submission ──────────────────────────────────────

  it('passes subtitle to onConfirm when typed', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(makeList(), onConfirm)
    const subtitleInput = screen.getAllByPlaceholderText('Optional')[0]
    await user.type(subtitleInput, 'Top films')
    await user.click(screen.getByText('Save'))
    expect(onConfirm).toHaveBeenCalledWith('Action', 'Top films', undefined)
  })

  it('passes description to onConfirm when typed', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(makeList(), onConfirm)
    const descInput = screen.getAllByPlaceholderText('Optional')[1]
    await user.type(descInput, 'A great collection')
    await user.click(screen.getByText('Save'))
    expect(onConfirm).toHaveBeenCalledWith('Action', undefined, 'A great collection')
  })

  it('passes both subtitle and description to onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(makeList(), onConfirm)
    const [subtitleInput, descInput] = screen.getAllByPlaceholderText('Optional')
    await user.type(subtitleInput, 'Sub')
    await user.type(descInput, 'Desc')
    await user.click(screen.getByText('Save'))
    expect(onConfirm).toHaveBeenCalledWith('Action', 'Sub', 'Desc')
  })

  it('passes undefined for subtitle when field is only whitespace', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(makeList({ subtitle: '   ' }), onConfirm)
    await user.click(screen.getByText('Save'))
    expect(onConfirm).toHaveBeenCalledWith('Action', undefined, undefined)
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  it('disables Save button when name is cleared', async () => {
    const user = userEvent.setup()
    renderDialog(makeList({ name: 'Action' }))
    await user.clear(screen.getByPlaceholderText('List name'))
    expect(screen.getByText('Save')).toBeDisabled()
  })

  // ── Default list name guard ────────────────────────────────────────────────

  it('disables the name input for the default list', () => {
    renderDialog(makeList({ name: 'All Movies' }))
    expect(screen.getByPlaceholderText('List name')).toBeDisabled()
  })

  // ── Success / close ────────────────────────────────────────────────────────

  it('calls onClose after successful save', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<EditListDialog list={makeList()} onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByText('Save'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog(makeList(), vi.fn(), onClose)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape key in name field', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog(makeList(), vi.fn(), onClose)
    await user.type(screen.getByPlaceholderText('List name'), '{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape key in subtitle field', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog(makeList(), vi.fn(), onClose)
    await user.type(screen.getAllByPlaceholderText('Optional')[0], '{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  // ── Error handling ─────────────────────────────────────────────────────────

  it('shows error message when onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('name already exists'))
    const user = userEvent.setup()
    renderDialog(makeList(), onConfirm)
    await user.click(screen.getByText('Save'))
    expect(screen.getByText('name already exists')).toBeInTheDocument()
  })

  it('does not call onClose when onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('fail'))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<EditListDialog list={makeList()} onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByText('Save'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
