import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { HelpDeskApiService } from '../../core/helpdesk-api.service';
import { Category, ROLES, ReportSummary, Role, UserSummary } from '../../core/models';
import { describeError } from '../../core/problem-details';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, DecimalPipe, KeyValuePipe],
  styles: `
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; }
    .stat { border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem; }
    .stat strong { display: block; font-size: 1.5rem; }
  `,
  template: `
    <h1>Admin</h1>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="success">{{ notice() }}</p>
    }

    <section class="card">
      <h2>Report summary</h2>
      @if (report(); as r) {
        <div class="stats">
          @for (s of r.ticketsByStatus | keyvalue; track s.key) {
            <div class="stat"><span class="muted">{{ s.key }}</span><strong>{{ s.value }}</strong></div>
          }
          <div class="stat"><span class="muted">Unassigned open</span><strong>{{ r.unassignedOpenTickets }}</strong></div>
          <div class="stat"><span class="muted">Overdue (&gt;72h)</span><strong>{{ r.overdueTickets }}</strong></div>
          <div class="stat"><span class="muted">Avg. resolution</span><strong>{{ r.averageResolutionHours | number: '1.0-1' }} h</strong></div>
        </div>
        @if ((r.ticketsPerAgent | keyvalue).length) {
          <h3 style="margin-top: 1rem">Tickets per agent</h3>
          <ul>
            @for (a of r.ticketsPerAgent | keyvalue; track a.key) {
              <li>{{ userName(a.key) }}: {{ a.value }}</li>
            }
          </ul>
        }
      } @else {
        <p class="muted">Loading…</p>
      }
    </section>

    <section class="card table-wrap">
      <h2>Users</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
        </thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td>{{ u.fullName }}</td>
              <td>{{ u.email }}</td>
              <td>
                <select [(ngModel)]="roleEdits[u.id]" style="width: auto">
                  @for (r of roles; track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
              </td>
              <td>
                <button class="btn-secondary" [disabled]="busy() || roleEdits[u.id] === u.roles[0]" (click)="saveRole(u)">Save</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <section class="card table-wrap">
      <h2>Categories</h2>
      <div class="actions" style="margin-bottom: 1rem">
        <input [(ngModel)]="newCategory" placeholder="New category name" style="max-width: 320px; margin: 0" />
        <button [disabled]="busy() || !newCategory.trim()" (click)="addCategory()">Add</button>
      </div>
      <table>
        <thead>
          <tr><th>Name</th><th>Active</th><th></th></tr>
        </thead>
        <tbody>
          @for (c of categories(); track c.id) {
            <tr>
              <td><input [(ngModel)]="c.name" style="margin: 0" /></td>
              <td><input type="checkbox" [(ngModel)]="c.isActive" /></td>
              <td><button class="btn-secondary" [disabled]="busy()" (click)="saveCategory(c)">Save</button></td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `
})
export class AdminComponent implements OnInit {
  private readonly api = inject(HelpDeskApiService);

  readonly roles = ROLES;
  readonly report = signal<ReportSummary | null>(null);
  readonly users = signal<UserSummary[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  roleEdits: Record<string, Role> = {};
  newCategory = '';

  ngOnInit(): void {
    this.loadAll();
  }

  userName(id: string): string {
    return this.users().find(u => u.id === id)?.fullName ?? id;
  }

  saveRole(user: UserSummary): void {
    const role = this.roleEdits[user.id];
    this.run(this.api.changeUserRole(user.id, role), `${user.fullName} is now ${role}.`);
  }

  addCategory(): void {
    this.run(this.api.createCategory(this.newCategory.trim()), 'Category added.', () => (this.newCategory = ''));
  }

  saveCategory(c: Category): void {
    this.run(this.api.updateCategory(c.id, c.name.trim(), c.isActive), `Category "${c.name}" saved.`);
  }

  private run(request: Observable<unknown>, message: string, onSuccess?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: () => {
        onSuccess?.();
        this.notice.set(message);
        this.busy.set(false);
        this.loadAll();
      },
      error: err => {
        this.error.set(describeError(err));
        this.busy.set(false);
      }
    });
  }

  private loadAll(): void {
    const fail = (err: unknown) => this.error.set(describeError(err));
    this.api.getReportSummary().subscribe({ next: r => this.report.set(r), error: fail });
    this.api.listUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.roleEdits = Object.fromEntries(users.map(u => [u.id, u.roles[0] ?? 'Customer']));
      },
      error: fail
    });
    this.api.listAllCategories().subscribe({ next: c => this.categories.set(c), error: fail });
  }
}
