export type Role = 'Customer' | 'Agent' | 'Admin';
export const ROLES: Role[] = ['Customer', 'Agent', 'Admin'];

export const TICKET_STATUSES = ['Open', 'InProgress', 'WaitingForCustomer', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Mirrors Ticket.AllowedTransitions in HelpDesk.Domain - the API is still the source of truth. */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  Open: ['InProgress', 'WaitingForCustomer', 'Resolved', 'Closed'],
  InProgress: ['WaitingForCustomer', 'Resolved', 'Open', 'Closed'],
  WaitingForCustomer: ['Open', 'InProgress', 'Closed'],
  Resolved: ['Closed', 'Open'],
  Closed: ['Open']
};

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: string;
  assignedAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket extends TicketSummary {
  description: string;
  customerId: string;
}

export interface TicketHistory {
  id: string;
  changedById: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

export interface TicketComment {
  id: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TicketFilters {
  status?: TicketStatus | '';
  priority?: TicketPriority | '';
  categoryId?: string;
  unassignedOnly?: boolean;
  assignedToMe?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
}

export interface ReportSummary {
  ticketsByStatus: Record<string, number>;
  unassignedOpenTickets: number;
  overdueTickets: number;
  averageResolutionHours: number;
  ticketsPerAgent: Record<string, number>;
}
