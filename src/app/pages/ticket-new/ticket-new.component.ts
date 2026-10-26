import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HelpDeskApiService } from '../../core/helpdesk-api.service';
import { Category, TICKET_PRIORITIES, TicketPriority } from '../../core/models';
import { describeError } from '../../core/problem-details';

@Component({
  selector: 'app-ticket-new',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card" style="max-width: 720px">
      <h1>New ticket</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Title <input formControlName="title" maxlength="200" /></label>
        <label>Description <textarea formControlName="description"></textarea></label>
        <div class="row">
          <label>
            Priority
            <select formControlName="priority">
              @for (p of priorities; track p) {
                <option [value]="p">{{ p }}</option>
              }
            </select>
          </label>
          <label>
            Category
            <select formControlName="categoryId">
              <option value="" disabled>Choose…</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </label>
        </div>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <div class="actions">
          <button type="submit" [disabled]="form.invalid || busy()">{{ busy() ? 'Submitting…' : 'Submit ticket' }}</button>
          <a class="btn btn-secondary" routerLink="/tickets">Cancel</a>
        </div>
      </form>
    </div>
  `
})
export class TicketNewComponent implements OnInit {
  private readonly api = inject(HelpDeskApiService);
  private readonly router = inject(Router);

  readonly priorities = TICKET_PRIORITIES;
  readonly categories = signal<Category[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.required],
    priority: ['Normal' as TicketPriority, Validators.required],
    categoryId: ['', Validators.required]
  });

  ngOnInit(): void {
    this.api.listCategories().subscribe({
      next: c => this.categories.set(c),
      error: err => this.error.set(describeError(err))
    });
  }

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.createTicket(this.form.getRawValue()).subscribe({
      next: ticket => this.router.navigate(['/tickets', ticket.id]),
      error: err => {
        this.error.set(describeError(err));
        this.busy.set(false);
      }
    });
  }
}
