import { HttpErrorResponse } from '@angular/common/http';

/** Turns the API's ProblemDetails / ValidationProblemDetails responses into a readable message. */
export function describeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong.';
  }
  if (error.status === 0 || error.status === 502 || error.status === 504) {
    return 'Cannot reach the HelpDesk API. Is it running on http://localhost:5146?';
  }

  const body = error.error;
  if (body && typeof body === 'object') {
    if (body.errors && typeof body.errors === 'object') {
      const messages = Object.values(body.errors as Record<string, string[]>).flat();
      if (messages.length) {
        return messages.join(' ');
      }
    }
    if (body.detail) {
      return body.detail;
    }
    if (body.title) {
      return body.title;
    }
  }
  return `Request failed (${error.status}).`;
}
