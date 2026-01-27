import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FolderItem from './FolderItem';
import { useFoldersStore } from '../../stores/folders-store';
import type { FolderTree } from '../../../shared/types/folder';

// Mock the folders store
vi.mock('../../stores/folders-store', () => ({
  useFoldersStore: vi.fn(),
}));

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

describe('FolderItem', () => {
  const mockToggleExpanded = vi.fn();
  const mockUpdateFolder = vi.fn();
  const mockDeleteFolder = vi.fn();
  const mockCreateFolder = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnDrop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFoldersStore).mockReturnValue({
      expandedFolderIds: new Set(),
      toggleExpanded: mockToggleExpanded,
      updateFolder: mockUpdateFolder,
      deleteFolder: mockDeleteFolder,
      createFolder: mockCreateFolder,
    });

    mockUpdateFolder.mockResolvedValue(undefined);
    mockDeleteFolder.mockResolvedValue(undefined);
    mockCreateFolder.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders folder name', () => {
    const folder = createMockFolderTree({ name: 'My Documents' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    expect(screen.getByText('My Documents')).toBeInTheDocument();
  });

  it('renders capture count badge when captureCount > 0', () => {
    const folder = createMockFolderTree({ captureCount: 15 });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('does not render capture count badge when captureCount is 0', () => {
    const folder = createMockFolderTree({ captureCount: 0 });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    // Should not find "0" as a badge
    const badges = screen.queryByText('0');
    expect(badges).not.toBeInTheDocument();
  });

  it('clicking folder calls onSelect with folder id', () => {
    const folder = createMockFolderTree({ id: 5 });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    fireEvent.click(screen.getByText(folder.name));

    expect(mockOnSelect).toHaveBeenCalledWith(5);
  });

  it('applies selected styling when isSelected is true', () => {
    const folder = createMockFolderTree();

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={true}
      />
    );

    const folderElement = screen.getByText(folder.name).closest('div');
    expect(folderElement).toHaveClass('bg-primary-100');
  });

  it('shows expand/collapse toggle for folders with children', () => {
    const childFolder = createMockFolderTree({ id: 2, name: 'Child' });
    const folder = createMockFolderTree({
      id: 1,
      children: [childFolder],
    });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    // Find the expand toggle button
    const toggleButton = screen.getByRole('button', { hidden: true });
    expect(toggleButton).toBeVisible();
  });

  it('clicking expand toggle calls toggleExpanded', () => {
    const childFolder = createMockFolderTree({ id: 2, name: 'Child' });
    const folder = createMockFolderTree({
      id: 1,
      children: [childFolder],
    });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    // Find and click the toggle button (the first button, which is the expand toggle)
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[0];
    fireEvent.click(toggleButton);

    expect(mockToggleExpanded).toHaveBeenCalledWith(1);
    // onSelect should not be called when clicking toggle
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('renders children when expanded', () => {
    const childFolder = createMockFolderTree({ id: 2, name: 'Child Folder' });
    const folder = createMockFolderTree({
      id: 1,
      name: 'Parent Folder',
      children: [childFolder],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      expandedFolderIds: new Set([1]), // Parent is expanded
      toggleExpanded: mockToggleExpanded,
      updateFolder: mockUpdateFolder,
      deleteFolder: mockDeleteFolder,
      createFolder: mockCreateFolder,
    });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    expect(screen.getByText('Parent Folder')).toBeInTheDocument();
    expect(screen.getByText('Child Folder')).toBeInTheDocument();
  });

  it('does not render children when collapsed', () => {
    const childFolder = createMockFolderTree({ id: 2, name: 'Hidden Child' });
    const folder = createMockFolderTree({
      id: 1,
      name: 'Parent',
      children: [childFolder],
    });

    vi.mocked(useFoldersStore).mockReturnValue({
      expandedFolderIds: new Set(), // Not expanded
      toggleExpanded: mockToggleExpanded,
      updateFolder: mockUpdateFolder,
      deleteFolder: mockDeleteFolder,
      createFolder: mockCreateFolder,
    });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Child')).not.toBeInTheDocument();
  });

  it('shows context menu on right-click', async () => {
    const folder = createMockFolderTree({ name: 'Contextual' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Contextual').closest('div');
    fireEvent.contextMenu(folderElement!);

    await waitFor(() => {
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('New Subfolder')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('clicking Rename in context menu enables inline editing', async () => {
    const folder = createMockFolderTree({ name: 'Editable' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Editable').closest('div');
    fireEvent.contextMenu(folderElement!);

    fireEvent.click(await screen.findByText('Rename'));

    // Should now have an input field
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Editable');
  });

  it('pressing Enter saves the renamed folder', async () => {
    const folder = createMockFolderTree({ id: 3, name: 'Original' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Original').closest('div');
    fireEvent.contextMenu(folderElement!);

    fireEvent.click(await screen.findByText('Rename'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockUpdateFolder).toHaveBeenCalledWith(3, { name: 'Renamed' });
    });
  });

  it('pressing Escape cancels renaming', async () => {
    const folder = createMockFolderTree({ id: 3, name: 'Original' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Original').closest('div');
    fireEvent.contextMenu(folderElement!);

    fireEvent.click(await screen.findByText('Rename'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    // Should not call updateFolder
    expect(mockUpdateFolder).not.toHaveBeenCalled();

    // Should exit editing mode and show original name
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('Original')).toBeInTheDocument();
    });
  });

  it('clicking Delete in context menu shows confirmation and deletes folder', async () => {
    const folder = createMockFolderTree({ id: 7, name: 'ToDelete' });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('ToDelete').closest('div');
    fireEvent.contextMenu(folderElement!);

    fireEvent.click(await screen.findByText('Delete'));

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockDeleteFolder).toHaveBeenCalledWith(7);
    });

    confirmSpy.mockRestore();
  });

  it('Delete cancelled does not delete folder', async () => {
    const folder = createMockFolderTree({ id: 7, name: 'Keep' });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Keep').closest('div');
    fireEvent.contextMenu(folderElement!);

    fireEvent.click(await screen.findByText('Delete'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteFolder).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('handles drop event and calls onDrop', async () => {
    const folder = createMockFolderTree({ id: 10, name: 'Drop Target' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
        onDrop={mockOnDrop}
      />
    );

    const folderElement = screen.getByText('Drop Target').closest('div');

    // Simulate drag over
    fireEvent.dragOver(folderElement!, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    // Simulate drop with capture IDs
    const dropEvent = new Event('drop', { bubbles: true });
    Object.assign(dropEvent, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ captureIds: [1, 2, 3] })),
      },
    });

    fireEvent(folderElement!, dropEvent);

    await waitFor(() => {
      expect(mockOnDrop).toHaveBeenCalledWith([1, 2, 3], 10);
    });
  });

  it('applies correct depth-based padding', () => {
    const folder = createMockFolderTree({ name: 'Nested' });

    render(
      <FolderItem
        folder={folder}
        depth={2}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Nested').closest('div');
    // depth * 12 + 8 = 2 * 12 + 8 = 32px
    expect(folderElement).toHaveStyle({ paddingLeft: '32px' });
  });

  it('blur on input saves rename', async () => {
    const folder = createMockFolderTree({ id: 3, name: 'Original' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Original').closest('div');
    fireEvent.contextMenu(folderElement!);

    fireEvent.click(await screen.findByText('Rename'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Blurred' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateFolder).toHaveBeenCalledWith(3, { name: 'Blurred' });
    });
  });

  it('does not save if name is unchanged', async () => {
    const folder = createMockFolderTree({ id: 3, name: 'Same' });

    render(
      <FolderItem
        folder={folder}
        depth={0}
        onSelect={mockOnSelect}
        isSelected={false}
      />
    );

    const folderElement = screen.getByText('Same').closest('div');
    fireEvent.contextMenu(folderElement!);

    fireEvent.click(await screen.findByText('Rename'));

    const input = screen.getByRole('textbox');
    // Don't change the value
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockUpdateFolder).not.toHaveBeenCalled();
  });

  describe('invalid drag data handling', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('ignores drop with malformed JSON', async () => {
      const folder = createMockFolderTree({ id: 10, name: 'Target' });

      render(
        <FolderItem
          folder={folder}
          depth={0}
          onSelect={mockOnSelect}
          isSelected={false}
          onDrop={mockOnDrop}
        />
      );

      const folderElement = screen.getByText('Target').closest('div');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.assign(dropEvent, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue('not valid json'),
        },
      });

      fireEvent(folderElement!, dropEvent);

      expect(mockOnDrop).not.toHaveBeenCalled();
    });

    it('ignores drop with missing captureIds field', async () => {
      const folder = createMockFolderTree({ id: 10, name: 'Target' });

      render(
        <FolderItem
          folder={folder}
          depth={0}
          onSelect={mockOnSelect}
          isSelected={false}
          onDrop={mockOnDrop}
        />
      );

      const folderElement = screen.getByText('Target').closest('div');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.assign(dropEvent, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(JSON.stringify({ other: 'data' })),
        },
      });

      fireEvent(folderElement!, dropEvent);

      expect(mockOnDrop).not.toHaveBeenCalled();
    });

    it('ignores drop with empty captureIds array', async () => {
      const folder = createMockFolderTree({ id: 10, name: 'Target' });

      render(
        <FolderItem
          folder={folder}
          depth={0}
          onSelect={mockOnSelect}
          isSelected={false}
          onDrop={mockOnDrop}
        />
      );

      const folderElement = screen.getByText('Target').closest('div');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.assign(dropEvent, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(JSON.stringify({ captureIds: [] })),
        },
      });

      fireEvent(folderElement!, dropEvent);

      expect(mockOnDrop).not.toHaveBeenCalled();
    });

    it('ignores drop with non-array captureIds', async () => {
      const folder = createMockFolderTree({ id: 10, name: 'Target' });

      render(
        <FolderItem
          folder={folder}
          depth={0}
          onSelect={mockOnSelect}
          isSelected={false}
          onDrop={mockOnDrop}
        />
      );

      const folderElement = screen.getByText('Target').closest('div');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.assign(dropEvent, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(JSON.stringify({ captureIds: 'not an array' })),
        },
      });

      fireEvent(folderElement!, dropEvent);

      expect(mockOnDrop).not.toHaveBeenCalled();
    });

    it('ignores drop when no dataTransfer data', async () => {
      const folder = createMockFolderTree({ id: 10, name: 'Target' });

      render(
        <FolderItem
          folder={folder}
          depth={0}
          onSelect={mockOnSelect}
          isSelected={false}
          onDrop={mockOnDrop}
        />
      );

      const folderElement = screen.getByText('Target').closest('div');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.assign(dropEvent, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(''),
        },
      });

      fireEvent(folderElement!, dropEvent);

      expect(mockOnDrop).not.toHaveBeenCalled();
    });
  });

  describe('context menu behavior', () => {
    it('closes context menu when clicking outside', async () => {
      const folder = createMockFolderTree({ name: 'Test' });

      render(
        <FolderItem
          folder={folder}
          depth={0}
          onSelect={mockOnSelect}
          isSelected={false}
        />
      );

      const folderElement = screen.getByText('Test').closest('div');
      fireEvent.contextMenu(folderElement!);

      // Context menu should be visible
      await waitFor(() => {
        expect(screen.getByText('Rename')).toBeInTheDocument();
      });

      // Click outside (simulate mousedown on document body)
      fireEvent.mouseDown(document.body);

      // Context menu should be closed
      await waitFor(() => {
        expect(screen.queryByText('Rename')).not.toBeInTheDocument();
      });
    });
  });

  describe('nested folder selection', () => {
    it('clicking nested child folder calls onSelect with child id', () => {
      const childFolder = createMockFolderTree({ id: 20, name: 'Child' });
      const parentFolder = createMockFolderTree({
        id: 10,
        name: 'Parent',
        children: [childFolder],
      });

      vi.mocked(useFoldersStore).mockReturnValue({
        expandedFolderIds: new Set([10]), // Parent is expanded
        toggleExpanded: mockToggleExpanded,
        updateFolder: mockUpdateFolder,
        deleteFolder: mockDeleteFolder,
        createFolder: mockCreateFolder,
      });

      render(
        <FolderItem
          folder={parentFolder}
          depth={0}
          onSelect={mockOnSelect}
          isSelected={false}
        />
      );

      // Click the child folder
      fireEvent.click(screen.getByText('Child'));

      expect(mockOnSelect).toHaveBeenCalledWith(20);
    });
  });
});
