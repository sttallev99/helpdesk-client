import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { HelpDeskApiService } from '../../core/helpdesk-api.service';
import {
  ALLOWED_TRANSITIONS,
  Category,
  Ticket,
  TicketComment,
  TicketHistory,
  TicketStatus,
  UserSummary
} from '../../core/models';
import { describeError } from '../../core/problem-details';

@Component({
  selector: 'app-ticket-detail',
  imports: [FormsModule, RouterLink, DatePipe],
  styles: `
    .comment { border-top: 1px solid var(--border); padding: 0.75rem 0; }
    .comment.internal { background: var(--internal); padding: 0.75rem; border-radius: 6px; border: none; margin-bottom: 0.5rem; }
    .comment p { margin: 0.25rem 0 0; white-space: pre-wrap; }
    .description { white-space: pre-wrap; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 0; }
    dt { color: var(--muted); }
    dd { margin: 0; }
  `,
  template: `
    <p><a routerLink="/tickets">← Back to tickets</a></p>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="success">{{ notice() }}</p>
    }

    @if (ticket(); as t) {
      <div class="card">
        @if (editing()) {
          <h2>Edit {{ t.ticketNumber }}</h2>
          <label>Title <input [(ngModel)]="edit.title" maxlength="200" /></label>
          <label>Description <textarea [(ngModel)]="edit.description"></textarea></label>
          <label>
            Category
            <select [(ngModel)]="edit.categoryId">
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </label>
          <div class="actions">
            <button [disabled]="busy()" (click)="saveEdit()">Save</button>
            <button class="btn-secondary" (click)="editing.set(false)">Cancel</button>
          </div>
        } @else {
          <div class="actions" style="justify-content: space-between">
            <h1 style="margin: 0">{{ t.ticketNumber }} · {{ t.title }}</h1>
            @if (canEdit()) {
              <button class="btn-secondary" (click)="startEdit(t)">Edit</button>
            }
          </div>
          <dl style="margin-top: 1rem">
            <dt>Status</dt><dd><span class="badge">{{ t.status }}</span></dd>
            <dt>Priority</dt><dd>{{ t.priority }}</dd>
            <dt>Category</dt><dd>{{ categoryName(t.categoryId) }}</dd>
            <dt>Assigned</dt><dd>{{ t.assignedAgentId ? personName(t.assignedAgentId) : 'Unassigned' }}</dd>
            <dt>Created</dt><dd>{{ t.createdAt | date: 'medium' }}</dd>
            <dt>Updated</dt><dd>{{ t.updatedAt | date: 'medium' }}</dd>
          </dl>
          <p class="description">{{ t.description }}</p>
        }
      </div>

      <div class="card">
        <h3>Actions</h3>
        <div class="actions">
          @if (auth.isAgent() && !t.assignedAgentId && t.status === 'Open') {
            <button [disabled]="busy()" (click)="run(api.claimTicket(t.id), 'Ticket claimed.')">Claim</button>
          }

          @if (auth.isStaff()) {
            <select [(ngModel)]="newStatus" style="width: auto">
              <option value="" disabled>Change status…</option>
              @for (s of nextStatuses(); track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
            <button [disabled]="busy() || !newStatus" (click)="changeStatus(t.id)">Update status</button>
          } @else if (t.status === 'Resolved' || t.status === 'Closed') {
            <button [disabled]="busy()" (click)="run(api.changeStatus(t.id, 'Open'), 'Ticket reopened.')">Reopen ticket</button>
          }

          @if (auth.isAdmin()) {
            <select [(ngModel)]="agentId" style="width: auto">
              <option value="" disabled>Assign to agent…</option>
              @for (a of agents(); track a.id) {
                <option [value]="a.id">{{ a.fullName }}</option>
              }
            </select>
            <button [disabled]="busy() || !agentId" (click)="assign(t.id)">Assign</button>
          }
        </div>
      </div>

      <div class="card">
        <h3>Conversation</h3>
        @for (c of comments(); track c.id) {
          <div class="comment" [class.internal]="c.isInternal">
            <strong>{{ authorLabel(c, t) }}</strong>
            @if (c.isInternal) {
              <span class="badge">Internal note</span>
            }
            <span class="muted"> · {{ c.createdAt | date: 'short' }}</span>
            <p>{{ c.content }}</p>
          </div>
        } @empty {
          <p class="muted">No replies yet.</p>
        }

        <label style="margin-top: 1rem">
          {{ auth.isStaff() ? 'Reply or internal note' : 'Reply' }}
          <textarea [(ngModel)]="reply"></textarea>
        </label>
        <div class="actions">
          <button [disabled]="busy() || !reply.trim()" (click)="sendReply(t.id, false)">Send reply</button>
          @if (auth.isStaff()) {
            <button class="btn-secondary" [disabled]="busy() || !reply.trim()" (click)="sendReply(t.id, true)">Add internal note</button>
          }
        </div>
      </div>

      <div class="card table-wrap">
        <h3>History</h3>
        <table>
          <thead>
            <tr><th>When</th><th>Who</th><th>Field</th><th>From</th><th>To</th></tr>
          </thead>
          <tbody>
            @for (h of history(); track h.id) {
              <tr>
                <td>{{ h.changedAt | date: 'short' }}</td>
                <td>{{ personName(h.changedById) }}</td>
                <td>{{ h.field }}</td>
                <td>{{ h.oldValue ?? '—' }}</td>
                <td>{{ h.newValue ?? '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!error()) {
      <p class="muted">Loading…</p>
    }
  `
})
export class TicketDetailComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly api = inject(HelpDeskApiService);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  readonly ticket = signal<Ticket | null>(null);
  readonly comments = signal<TicketComment[]>([]);
  readonly history = signal<TicketHistory[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly users = signal<UserSummary[]>([]);
  readonly busy = signal(false);
  readonly editing = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly agents = computed(() => this.users().filter(u => u.roles.includes('Agent')));
  readonly nextStatuses = computed(() => {
    const t = this.ticket();
    return t ? ALLOWED_TRANSITIONS[t.status] : [];
  });
  readonly canEdit = computed(() => {
    const t = this.ticket();
    if (!t || t.status === 'Resolved' || t.status === 'Closed') {
      return false;
    }
    return this.auth.isStaff() || t.customerId === this.auth.user()?.id;
  });

  newStatus: TicketStatus | '' = '';
  agentId = '';
  reply = '';
  edit = { title: '', description: '', categoryId: '' };

  ngOnInit(): void {
    this.api.listCategories().subscribe({ next: c => this.categories.set(c) });
    if (this.auth.isAdmin()) {
      // Only admins can list users; it lets us show names instead of ids.
      this.api.listUsers().subscribe({ next: u => this.users.set(u) });
    }
    this.reload();
  }

  categoryName(id: string): string {
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  personName(id: string): string {
    if (id === this.auth.user()?.id) {
      return 'You';
    }
    return this.users().find(u => u.id === id)?.fullName ?? (this.ticket()?.customerId === id ? 'Customer' : 'Support');
  }

  authorLabel(c: TicketComment, t: Ticket): string {
    if (c.authorId === this.auth.user()?.id) {
      return 'You';
    }
    return this.users().find(u => u.id === c.authorId)?.fullName ?? (c.authorId === t.customerId ? 'Customer' : 'Support');
  }

  startEdit(t: Ticket): void {
    this.edit = { title: t.title, description: t.description, categoryId: t.categoryId };
    this.editing.set(true);
  }

  saveEdit(): void {
    this.run(this.api.updateTicket(this.id(), this.edit), 'Ticket updated.', () => this.editing.set(false));
  }

  changeStatus(id: string): void {
    if (this.newStatus) {
      this.run(this.api.changeStatus(id, this.newStatus), `Status changed to ${this.newStatus}.`);
    }
  }

  assign(id: string): void {
    this.run(this.api.assignTicket(id, this.agentId), 'Ticket assigned.');
  }

  sendReply(id: string, internal: boolean): void {
    const content = this.reply.trim();
    const request = internal ? this.api.addInternalNote(id, content) : this.api.addComment(id, content);
    this.run(request, internal ? 'Internal note added.' : 'Reply sent.', () => (this.reply = ''));
  }

  /** Runs a mutating call, then refreshes the ticket, comments, and history. */
  run(request: Observable<unknown>, successMessage: string, onSuccess?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: () => {
        onSuccess?.();
        this.notice.set(successMessage);
        this.newStatus = '';
        this.agentId = '';
        this.reload();
      },
      error: err => {
        this.error.set(describeError(err));
        this.busy.set(false);
        // A 409 usually means someone else changed the ticket - show the current state.
        this.reload();
      }
    });
  }

  private reload(): void {
    const id = this.id();
    this.api.getTicket(id).subscribe({
      next: t => {
        this.ticket.set(t);
        this.busy.set(false);
      },
      error: err => {
        this.error.set(describeError(err));
        this.busy.set(false);
      }
    });
    this.api.getComments(id).subscribe({ next: c => this.comments.set(c) });
    this.api.getHistory(id).subscribe({ next: h => this.history.set(h) });
  }
}
