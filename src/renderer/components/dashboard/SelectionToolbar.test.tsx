import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SelectionToolbar from './SelectionToolbar';
import { useCapturesStore } from '../../stores/captures-store';
import { useFoldersStore } from '../../stores/folders-store';
import type { Tag } from '../../../shared/types/capture';
import type { FolderTree } from '../../../shared/types/folder';

// Mock the stores
vi.mock('../../stores/captures-store', () => ({
  useCapturesStore: vi.fn(),
}));

vi.mock('../../stores/folders-store', () => ({
  useFoldersStore: vi.fn(),
}));

const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 1,
  name: 'Test Tag',
  color: '#FF0000',
  ...overrides,
});

const createMockFolderTree = (overrides: Partial<FolderTree> = {}): FolderTree => ({
  id: 1,
  name: 'Test Folder',
  parentId: null,
  color: null,
  icon: null,
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  children: [],
  captureCount: 0,
  ...overrides,
});

describe('SelectionToolbar', () => {
  const mockClearSelection = vi.fn();
  const mockSelectAll = vi.fn();
  const mockDeleteSelected = vi.fn();
  const mockMoveSelectedToFolder = vi.fn();
  const mockAddTagToSelected = vi.fn();
  const mockLoadFolderTree = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default empty selection
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set(),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });
  });

  it('renders nothing when no selection', () => {
    const { container } = render(<SelectionToolbar />);

    expect(container.firstChild).toBeNull();
  });

  it('shows selection count when items selected', () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1, 2, 3]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    render(<SelectionToolbar />);

    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('shows singular "selected" for one item', () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    render(<SelectionToolbar />);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('Select all button calls selectAll', () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Select all'));

    expect(mockSelectAll).toHaveBeenCalledTimes(1);
  });

  it('Move button shows folder dropdown', async () => {
    const folder1 = createMockFolderTree({ id: 1, name: 'Folder 1' });
    const folder2 = createMockFolderTree({ id: 2, name: 'Folder 2' });

    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [folder1, folder2],
      loadFolderTree: mockLoadFolderTree,
    });

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Move'));

    await waitFor(() => {
      expect(screen.getByText('Folder 1')).toBeInTheDocument();
      expect(screen.getByText('Folder 2')).toBeInTheDocument();
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });
  });

  it('clicking folder in dropdown calls moveSelectedToFolder', async () => {
    const folder = createMockFolderTree({ id: 5, name: 'Target Folder' });

    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1, 2]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [folder],
      loadFolderTree: mockLoadFolderTree,
    });

    mockMoveSelectedToFolder.mockResolvedValue(undefined);
    mockLoadFolderTree.mockResolvedValue(undefined);

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Move'));
    fireEvent.click(await screen.findByText('Target Folder'));

    await waitFor(() => {
      expect(mockMoveSelectedToFolder).toHaveBeenCalledWith(5);
      expect(mockLoadFolderTree).toHaveBeenCalled();
    });
  });

  it('clicking Uncategorized in dropdown calls moveSelectedToFolder with null', async () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    mockMoveSelectedToFolder.mockResolvedValue(undefined);
    mockLoadFolderTree.mockResolvedValue(undefined);

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Move'));
    fireEvent.click(await screen.findByText('Uncategorized'));

    await waitFor(() => {
      expect(mockMoveSelectedToFolder).toHaveBeenCalledWith(null);
    });
  });

  it('shows No folders message when folderTree is empty', async () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Move'));

    await waitFor(() => {
      expect(screen.getByText('No folders')).toBeInTheDocument();
    });
  });

  it('Tag button shows tag dropdown', async () => {
    const tag1 = createMockTag({ id: 1, name: 'Work' });
    const tag2 = createMockTag({ id: 2, name: 'Personal' });

    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [tag1, tag2],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Tag'));

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });
  });

  it('clicking tag in dropdown calls addTagToSelected', async () => {
    const tag = createMockTag({ id: 10, name: 'Important' });

    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1, 2]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [tag],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    mockAddTagToSelected.mockResolvedValue(undefined);

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Tag'));
    fireEvent.click(await screen.findByText('Important'));

    await waitFor(() => {
      expect(mockAddTagToSelected).toHaveBeenCalledWith(10);
    });
  });

  it('shows No tags message when tags array is empty', async () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Tag'));

    await waitFor(() => {
      expect(screen.getByText('No tags')).toBeInTheDocument();
    });
  });

  it('Delete button shows confirmation and calls deleteSelected', async () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1, 2]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    mockDeleteSelected.mockResolvedValue(undefined);
    mockLoadFolderTree.mockResolvedValue(undefined);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Delete'));

    expect(confirmSpy).toHaveBeenCalledWith('Delete 2 items?');

    await waitFor(() => {
      expect(mockDeleteSelected).toHaveBeenCalled();
      expect(mockLoadFolderTree).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('Delete button does not delete when confirmation cancelled', async () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    // Mock window.confirm to return false (cancelled)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Delete'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteSelected).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('Clear button calls clearSelection', () => {
    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1, 2, 3]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      loadFolderTree: mockLoadFolderTree,
    });

    render(<SelectionToolbar />);

    // Find the clear button by its title
    const clearButton = screen.getByTitle('Clear selection');
    fireEvent.click(clearButton);

    expect(mockClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders nested folder hierarchy in move dropdown', async () => {
    const childFolder = createMockFolderTree({ id: 2, name: 'Child Folder' });
    const parentFolder = createMockFolderTree({
      id: 1,
      name: 'Parent Folder',
      children: [childFolder],
    });

    vi.mocked(useCapturesStore).mockReturnValue({
      selectedIds: new Set([1]),
      clearSelection: mockClearSelection,
      selectAll: mockSelectAll,
      deleteSelected: mockDeleteSelected,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      addTagToSelected: mockAddTagToSelected,
      tags: [],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [parentFolder],
      loadFolderTree: mockLoadFolderTree,
    });

    render(<SelectionToolbar />);

    fireEvent.click(screen.getByText('Move'));

    await waitFor(() => {
      expect(screen.getByText('Parent Folder')).toBeInTheDocument();
      expect(screen.getByText('Child Folder')).toBeInTheDocument();
    });
  });

});
