import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FolderTree from './FolderTree';
import { useFoldersStore } from '../../stores/folders-store';
import { useCapturesStore } from '../../stores/captures-store';
import type { FolderTree as FolderTreeType } from '../../../shared/types/folder';

// Mock the stores
vi.mock('../../stores/folders-store', () => ({
  useFoldersStore: vi.fn(),
}));

vi.mock('../../stores/captures-store', () => ({
  useCapturesStore: vi.fn(),
}));

const createMockFolderTree = (overrides: Partial<FolderTreeType> = {}): FolderTreeType => ({
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

describe('FolderTree', () => {
  const mockSetCurrentFolder = vi.fn();
  const mockLoadFolderTree = vi.fn();
  const mockToggleExpanded = vi.fn();
  const mockSetFilters = vi.fn();
  const mockMoveSelectedToFolder = vi.fn();
  const mockClearSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 0,
      totalCount: 0,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    vi.mocked(useCapturesStore).mockReturnValue({
      setFilters: mockSetFilters,
      moveSelectedToFolder: mockMoveSelectedToFolder,
      clearSelection: mockClearSelection,
    });

    mockLoadFolderTree.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders All Captures virtual folder', () => {
    render(<FolderTree />);

    expect(screen.getByText('All Captures')).toBeInTheDocument();
  });

  it('renders Uncategorized virtual folder', () => {
    render(<FolderTree />);

    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders Folders section header', () => {
    render(<FolderTree />);

    expect(screen.getByText('Folders')).toBeInTheDocument();
  });

  it('shows total count on All Captures', () => {
    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 5,
      totalCount: 42,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows uncategorized count when greater than 0', () => {
    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 15,
      totalCount: 50,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('clicking All Captures calls setCurrentFolder and setFilters', () => {
    render(<FolderTree />);

    fireEvent.click(screen.getByText('All Captures'));

    expect(mockSetCurrentFolder).toHaveBeenCalledWith('all');
    expect(mockSetFilters).toHaveBeenCalledWith({ folderId: undefined });
  });

  it('clicking Uncategorized calls setCurrentFolder and setFilters', () => {
    render(<FolderTree />);

    fireEvent.click(screen.getByText('Uncategorized'));

    expect(mockSetCurrentFolder).toHaveBeenCalledWith('uncategorized');
    expect(mockSetFilters).toHaveBeenCalledWith({ folderId: 'uncategorized' });
  });

  it('renders folder hierarchy from folderTree state', () => {
    const folder1 = createMockFolderTree({ id: 1, name: 'Projects', captureCount: 10 });
    const folder2 = createMockFolderTree({ id: 2, name: 'Screenshots', captureCount: 5 });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [folder1, folder2],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 0,
      totalCount: 15,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Screenshots')).toBeInTheDocument();
  });

  it('shows capture counts for each folder', () => {
    const folder = createMockFolderTree({ id: 1, name: 'Work', captureCount: 7 });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [folder],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 0,
      totalCount: 25,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    // Total count should be 25
    expect(screen.getByText('25')).toBeInTheDocument();
    // Folder count should be 7 (different from total to avoid ambiguity)
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('highlights All Captures when currentFolderId is all', () => {
    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 0,
      totalCount: 0,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    const allButton = screen.getByText('All Captures').closest('button');
    expect(allButton).toHaveClass('bg-primary-100');
  });

  it('highlights Uncategorized when currentFolderId is uncategorized', () => {
    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      currentFolderId: 'uncategorized',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 0,
      totalCount: 0,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    const uncategorizedButton = screen.getByText('Uncategorized').closest('button');
    expect(uncategorizedButton).toHaveClass('bg-primary-100');
  });

  it('new folder button exists', () => {
    render(<FolderTree />);

    const newFolderButton = screen.getByTitle('New Folder');
    expect(newFolderButton).toBeInTheDocument();
  });

  it('calls loadFolderTree on mount', () => {
    render(<FolderTree />);

    expect(mockLoadFolderTree).toHaveBeenCalled();
  });

  it('renders nested folder children', () => {
    const childFolder = createMockFolderTree({ id: 2, name: 'Subfolder', captureCount: 3 });
    const parentFolder = createMockFolderTree({
      id: 1,
      name: 'Parent',
      captureCount: 10,
      children: [childFolder],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [parentFolder],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 0,
      totalCount: 13,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set([1]), // Parent is expanded
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Subfolder')).toBeInTheDocument();
  });

  it('does not show uncategorized count badge when count is 0', () => {
    vi.mocked(useFoldersStore).mockReturnValue({
      folderTree: [],
      currentFolderId: 'all',
      setCurrentFolder: mockSetCurrentFolder,
      uncategorizedCount: 0,
      totalCount: 10,
      loadFolderTree: mockLoadFolderTree,
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createFolder: vi.fn(),
    });

    render(<FolderTree />);

    // Total count should be visible (10)
    expect(screen.getByText('10')).toBeInTheDocument();

    // Uncategorized should exist but not have a count badge
    const uncategorizedButton = screen.getByText('Uncategorized').closest('button');
    // Should not contain "0" as a separate span
    const spans = uncategorizedButton?.querySelectorAll('span');
    const countSpans = Array.from(spans || []).filter(
      (span) => span.textContent === '0' && span.classList.contains('rounded-full')
    );
    expect(countSpans).toHaveLength(0);
  });
});
