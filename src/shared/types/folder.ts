export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTree extends Folder {
  children: FolderTree[];
  captureCount: number;
}

export interface CreateFolderInput {
  name: string;
  parentId?: number | null;
  color?: string;
  icon?: string;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: number | null;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}
