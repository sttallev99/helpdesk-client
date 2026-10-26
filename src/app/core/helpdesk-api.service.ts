import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Category,
  PaginatedList,
  ReportSummary,
  Role,
  Ticket,
  TicketComment,
  TicketFilters,
  TicketHistory,
  TicketPriority,
  TicketStatus,
  TicketSummary,
  UserSummary
} from './models';

@Injectable({ providedIn: 'root' })
export class HelpDeskApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // Tickets
  listTickets(filters: TicketFilters): Observable<PaginatedList<TicketSummary>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PaginatedList<TicketSummary>>(`${this.base}/tickets`, { params });
  }

  getTicket(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.base}/tickets/${id}`);
  }

  createTicket(body: { title: string; description: string; priority: TicketPriority; categoryId: string }): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.base}/tickets`, body);
  }

  updateTicket(id: string, body: { title: string; description: string; categoryId: string }): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/tickets/${id}`, body);
  }

  claimTicket(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.base}/tickets/${id}/claim`, {});
  }

  assignTicket(id: string, agentId: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.base}/tickets/${id}/assign`, { agentId });
  }

  changeStatus(id: string, newStatus: TicketStatus): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.base}/tickets/${id}/status`, { newStatus });
  }

  getHistory(id: string): Observable<TicketHistory[]> {
    return this.http.get<TicketHistory[]>(`${this.base}/tickets/${id}/history`);
  }

  getComments(id: string): Observable<TicketComment[]> {
    return this.http.get<TicketComment[]>(`${this.base}/tickets/${id}/comments`);
  }

  addComment(id: string, content: string): Observable<TicketComment> {
    return this.http.post<TicketComment>(`${this.base}/tickets/${id}/comments`, { content });
  }

  addInternalNote(id: string, content: string): Observable<TicketComment> {
    return this.http.post<TicketComment>(`${this.base}/tickets/${id}/internal-notes`, { content });
  }

  // Categories (active only - for forms)
  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  // Admin
  listUsers(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.base}/admin/users`);
  }

  changeUserRole(id: string, role: Role): Observable<void> {
    return this.http.patch<void>(`${this.base}/admin/users/${id}/role`, { role });
  }

  listAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/admin/categories`);
  }

  createCategory(name: string): Observable<Category> {
    return this.http.post<Category>(`${this.base}/admin/categories`, { name });
  }

  updateCategory(id: string, name: string, isActive: boolean): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/admin/categories/${id}`, { name, isActive });
  }

  getReportSummary(): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.base}/admin/reports/summary`);
  }
}
