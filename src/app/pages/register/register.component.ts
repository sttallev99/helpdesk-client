import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { describeError } from '../../core/problem-details';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card narrow">
      <h1>Create account</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Full name <input formControlName="fullName" autocomplete="name" /></label>
        <label>Email <input type="email" formControlName="email" autocomplete="email" /></label>
        <label>
          Password
          <input type="password" formControlName="password" autocomplete="new-password" />
          <small class="muted">At least 8 characters, with an uppercase letter, a lowercase letter, and a digit.</small>
        </label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || busy()">{{ busy() ? 'Creating…' : 'Register' }}</button>
      </form>
      <p class="muted">Already registered? <a routerLink="/login">Log in</a></p>
    </div>
  `
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(NonNullableFormBuilder).group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    const { fullName, email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth.register(fullName, email, password).subscribe({
      next: () => this.router.navigate(['/tickets']),
      error: err => {
        this.error.set(describeError(err));
        this.busy.set(false);
      }
    });
  }
}
