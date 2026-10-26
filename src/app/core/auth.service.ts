import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, CurrentUser, Role } from './models';

const TOKEN_KEY = 'helpdesk.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly token = signal<AuthResponse | null>(readStoredToken());
  readonly user = signal<CurrentUser | null>(null);

  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isCustomer = computed(() => this.user()?.roles.includes('Customer') ?? false);
  readonly isAgent = computed(() => this.user()?.roles.includes('Agent') ?? false);
  readonly isAdmin = computed(() => this.user()?.roles.includes('Admin') ?? false);
  readonly isStaff = computed(() => this.isAgent() || this.isAdmin());

  /** The current JWT, or null if there is none or it has expired. */
  get accessToken(): string | null {
    const token = this.token();
    if (!token) {
      return null;
    }
    if (new Date(token.expiresAtUtc).getTime() <= Date.now()) {
      this.clear();
      return null;
    }
    return token.accessToken;
  }

  /** Runs once at startup to restore the session from a stored token. */
  async restoreSession(): Promise<void> {
    if (!this.accessToken) {
      return;
    }
    try {
      await firstValueFrom(this.loadMe());
    } catch {
      this.clear();
    }
  }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(switchMap(res => this.startSession(res)));
  }

  register(fullName: string, email: string, password: string): Observable<CurrentUser> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, { fullName, email, password })
      .pipe(switchMap(res => this.startSession(res)));
  }

  logout(): void {
    this.clear();
    this.router.navigate(['/login']);
  }

  hasRole(role: Role): boolean {
    return this.user()?.roles.includes(role) ?? false;
  }

  private startSession(res: AuthResponse): Observable<CurrentUser> {
    const stored: AuthResponse = { accessToken: res.accessToken, expiresAtUtc: res.expiresAtUtc };
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
    } catch {
      // Storage unavailable (e.g. private mode) - the session just won't survive a reload.
    }
    this.token.set(stored);
    return this.loadMe();
  }

  private loadMe(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/me`).pipe(tap(user => this.user.set(user)));
  }

  private clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    this.token.set(null);
    this.user.set(null);
  }
}

function readStoredToken(): AuthResponse | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  } catch {
    return null;
  }
}
