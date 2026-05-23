export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

// Users
export type UserRole = 'admin' | 'member' | 'viewer';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
}

// Projects
export interface ProjectDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

// Statuses
export interface StatusDto {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  category: 'todo' | 'in_progress' | 'done';
}

// Epics
export interface EpicDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  color: string;
  startDate: string | null;
  endDate: string | null;
}

// Tickets
export type TicketType = 'task' | 'bug' | 'story';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface TicketDto {
  id: string;
  ticketNumber: string;
  projectId: string;
  title: string;
  description: string | null;
  type: TicketType;
  priority: Priority;
  statusId: string;
  statusName: string;
  epicId: string | null;
  epicTitle: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  reporterId: string;
  reporterName: string;
  storyPoints: number | null;
  dueDate: string | null;
  sprintId: string | null;
  sprintName: string | null;
  createdAt: string;
  updatedAt: string;
}

// Comments
export interface CommentDto {
  id: string;
  ticketId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  replies?: CommentDto[];
  attachments?: CommentAttachmentDto[];
}

export interface CommentAttachmentDto {
  id: string;
  commentId: string;
  uploadedById: string;
  uploaderName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  blobName: string;
  createdAt: string;
}

// Attachments
export interface AttachmentDto {
  id: string;
  ticketId: string;
  uploadedById: string;
  uploaderName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  blobName: string;
  createdAt: string;
}

// Work Logs
export interface WorkLogDto {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  minutesLogged: number;
  logDate: string;
  note: string | null;
  createdAt: string;
}

// Sprints
export type SprintStatus = 'planning' | 'active' | 'completed';

export interface SprintDto {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  createdBy: string;
  createdAt: string;
  ticketCount?: number;
  completedCount?: number;
}

// Activity
export interface ActivityDto {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}
