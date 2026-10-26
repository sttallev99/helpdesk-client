import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { HelpDeskApiService } from '../../core/helpdesk-api.service';
import { Category, PaginatedList, TICKET_PRIORITIES, TICKET_STATUSES, TicketFilters, TicketSummary } from '../../core/models';
import { describeError } from '../../core/problem-details';

@Component({
  selector: 'app-ticket-list',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="actions" style="justify-content: space-between; margin-bottom: 1rem">
      <h1 style="margin: 0">{{ auth.isCustomer() ? 'My tickets' : 'Tickets' }}</h1>
      @if (auth.isCustomer()) {
        <a class="btn" routerLink="/tickets/new">New ticket</a>
      }
    </div>

    <div class="card">
      <div class="row">
        <label>
          Status
          <select [(ngModel)]="filters.status" (ngModelChange)="search()">
            <option value="">Any</option>
            @for (s of statuses; track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
        </label>
        <label>
          Priority
          <select [(ngModel)]="filters.priority" (ngModelChange)="search()">
            <option value="">Any</option>
            @for (p of priorities; track p) {
              <option [value]="p">{{ p }}</option>
            }
          </select>
        </label>
        <label>
          Category
          <select [(ngModel)]="filters.categoryId" (ngModelChange)="search()">
            <option value="">Any</option>
            @for (c of categories(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
        </label>
      </div>
      @if (auth.isStaff()) {
        <div class="actions">
          <label><input type="checkbox" [(ngModel)]="filters.unassignedOnly" (ngModelChange)="search()" />Unassigned only</label>
          @if (auth.isAgent()) {
            <label><input type="checkbox" [(ngModel)]="filters.assignedToMe" (ngModelChange)="search()" />Assigned to me</label>
          }
        </div>
      }
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="card table-wrap">
      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (page()?.items?.length) {
        <table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Assigned</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            @for (t of page()!.items; track t.id) {
              <tr>
                <td><a [routerLink]="['/tickets', t.id]">{{ t.ticketNumber }}</a></td>
                <td>{{ t.title }}</td>
                <td><span class="badge">{{ t.status }}</span></td>
                <td>{{ t.priority }}</td>
                <td>{{ categoryName(t.categoryId) }}</td>
                <td>{{ t.assignedAgentId ? (t.assignedAgentId === auth.user()?.id ? 'Me' : 'Yes') : '—' }}</td>
                <td>{{ t.updatedAt | date: 'short' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="actions" style="margin-top: 1rem">
          <button class="btn-secondary" [disabled]="!page()!.hasPreviousPage" (click)="goTo(page()!.pageNumber - 1)">Previous</button>
          <span class="muted">Page {{ page()!.pageNumber }} of {{ page()!.totalPages }} · {{ page()!.totalCount }} tickets</span>
          <button class="btn-secondary" [disabled]="!page()!.hasNextPage" (click)="goTo(page()!.pageNumber + 1)">Next</button>
        </div>
      } @else {
        <p class="muted">No tickets match these filters.</p>
      }
    </div>
  `
})
export class TicketListComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(HelpDeskApiService);

  readonly statuses = TICKET_STATUSES;
  readonly priorities = TICKET_PRIORITIES;

  readonly categories = signal<Category[]>([]);
  readonly page = signal<PaginatedList<TicketSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly categoryNames = computed(() => new Map(this.categories().map(c => [c.id, c.name])));

  filters: TicketFilters = { status: '', priority: '', categoryId: '', unassignedOnly: false, assignedToMe: false, pageNumber: 1, pageSize: 20 };

  ngOnInit(): void {
    this.api.listCategories().subscribe({ next: c => this.categories.set(c) });
    this.load();
  }

  categoryName(id: string): string {
    return this.categoryNames().get(id) ?? '—';
  }

  search(): void {
    this.filters.pageNumber = 1;
    this.load();
  }

  goTo(pageNumber: number): void {
    this.filters.pageNumber = pageNumber;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listTickets(this.filters).subscribe({
      next: page => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(describeError(err));
        this.loading.set(false);
      }
    });
  }
}
