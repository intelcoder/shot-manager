import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TagEditor from './TagEditor';
import { useCapturesStore } from '../../stores/captures-store';
import type { CaptureFile, Tag } from '../../../shared/types/capture';

// Mock the captures store
vi.mock('../../stores/captures-store', () => ({
  useCapturesStore: vi.fn(),
}));

const createMockCapture = (overrides: Partial<CaptureFile> = {}): CaptureFile => ({
  id: 1,
  type: 'screenshot',
  filename: 'test.png',
  filepath: '/test/test.png',
  width: 1920,
  height: 1080,
  duration: null,
  size: 1000,
  thumbnail_path: null,
  created_at: '2024-01-01T00:00:00Z',
  tags: [],
  ...overrides,
});

const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 1,
  name: 'Test Tag',
  color: '#FF0000',
  ...overrides,
});

describe('TagEditor', () => {
  const mockAddTagToCapture = vi.fn();
  const mockRemoveTagFromCapture = vi.fn();
  const mockCreateTag = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });
  });

  it('renders existing tags from capture', () => {
    const tag1 = createMockTag({ id: 1, name: 'Work' });
    const tag2 = createMockTag({ id: 2, name: 'Important' });
    const capture = createMockCapture({ tags: [tag1, tag2] });

    render(<TagEditor capture={capture} />);

    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
  });

  it('renders tag label', () => {
    const capture = createMockCapture();

    render(<TagEditor capture={capture} />);

    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('clicking remove button calls removeTagFromCapture', async () => {
    const tag = createMockTag({ id: 5, name: 'ToRemove' });
    const capture = createMockCapture({ id: 10, tags: [tag] });

    render(<TagEditor capture={capture} />);

    const removeButton = screen.getByRole('button', { name: '×' });
    fireEvent.click(removeButton);

    expect(mockRemoveTagFromCapture).toHaveBeenCalledWith(10, 5);
    expect(mockRemoveTagFromCapture).toHaveBeenCalledTimes(1);
  });

  it('typing in input filters available tags', async () => {
    const tag1 = createMockTag({ id: 1, name: 'Work' });
    const tag2 = createMockTag({ id: 2, name: 'Personal' });
    const tag3 = createMockTag({ id: 3, name: 'Workout' });
    const capture = createMockCapture({ tags: [] });

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [tag1, tag2, tag3],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'work' } });

    // Should show Work and Workout (both contain 'work')
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Workout')).toBeInTheDocument();
    });

    // Personal should not be visible
    expect(screen.queryByRole('button', { name: 'Personal' })).not.toBeInTheDocument();
  });

  it('clicking a tag in dropdown calls addTagToCapture', async () => {
    const availableTag = createMockTag({ id: 7, name: 'Available' });
    const capture = createMockCapture({ id: 3, tags: [] });

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [availableTag],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.focus(input);

    // Find and click the tag in dropdown
    const tagButton = await screen.findByRole('button', { name: 'Available' });
    fireEvent.click(tagButton);

    expect(mockAddTagToCapture).toHaveBeenCalledWith(3, 7);
  });

  it('pressing Enter with new tag name creates tag and adds it', async () => {
    const capture = createMockCapture({ id: 1 });
    const newTag = createMockTag({ id: 99, name: 'Brand New' });

    mockCreateTag.mockResolvedValue(newTag);
    mockAddTagToCapture.mockResolvedValue(undefined);

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [], // No existing tags
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.change(input, { target: { value: 'Brand New' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith('Brand New');
    });

    await waitFor(() => {
      expect(mockAddTagToCapture).toHaveBeenCalledWith(1, 99);
    });
  });

  it('shows Create option when tag name does not exist', async () => {
    const existingTag = createMockTag({ id: 1, name: 'Existing' });
    const capture = createMockCapture();

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [existingTag],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'NonExistent' } });

    await waitFor(() => {
      expect(screen.getByText('Create "NonExistent"')).toBeInTheDocument();
    });
  });

  it('does not show Create option when tag already exists', async () => {
    const existingTag = createMockTag({ id: 1, name: 'Existing' });
    const capture = createMockCapture();

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [existingTag],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'existing' } }); // Case-insensitive match

    await waitFor(() => {
      expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
    });
  });

  it('hides already-assigned tags from dropdown', async () => {
    const assignedTag = createMockTag({ id: 1, name: 'Assigned' });
    const availableTag = createMockTag({ id: 2, name: 'Available' });
    const capture = createMockCapture({ tags: [assignedTag] });

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [assignedTag, availableTag],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.focus(input);

    // Available tag should be in dropdown
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Available' })).toBeInTheDocument();
    });

    // Assigned tag should not be in dropdown (only shown as a chip)
    const dropdownButtons = screen.getAllByRole('button');
    const assignedInDropdown = dropdownButtons.filter(
      (btn) => btn.textContent === 'Assigned' && btn.className.includes('hover:bg-gray-100')
    );
    expect(assignedInDropdown).toHaveLength(0);
  });

  it('pressing Enter with existing tag name adds it without creating', async () => {
    const existingTag = createMockTag({ id: 50, name: 'Existing' });
    const capture = createMockCapture({ id: 1, tags: [] });

    mockAddTagToCapture.mockResolvedValue(undefined);

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [existingTag],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.change(input, { target: { value: 'existing' } }); // Case-insensitive match
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockCreateTag).not.toHaveBeenCalled();
      expect(mockAddTagToCapture).toHaveBeenCalledWith(1, 50);
    });
  });

  it('clears input after adding a tag from dropdown', async () => {
    const availableTag = createMockTag({ id: 1, name: 'Available' });
    const capture = createMockCapture({ tags: [] });

    mockAddTagToCapture.mockResolvedValue(undefined);

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [availableTag],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'avail' } });

    const tagButton = await screen.findByRole('button', { name: 'Available' });
    fireEvent.click(tagButton);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('clicking Create button creates and adds tag', async () => {
    const capture = createMockCapture({ id: 1 });
    const newTag = createMockTag({ id: 123, name: 'NewTag' });

    mockCreateTag.mockResolvedValue(newTag);
    mockAddTagToCapture.mockResolvedValue(undefined);

    vi.mocked(useCapturesStore).mockReturnValue({
      tags: [],
      addTagToCapture: mockAddTagToCapture,
      removeTagFromCapture: mockRemoveTagFromCapture,
      createTag: mockCreateTag,
    });

    render(<TagEditor capture={capture} />);

    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'NewTag' } });

    const createButton = await screen.findByText('Create "NewTag"');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith('NewTag');
    });

    await waitFor(() => {
      expect(mockAddTagToCapture).toHaveBeenCalledWith(1, 123);
    });
  });
});
