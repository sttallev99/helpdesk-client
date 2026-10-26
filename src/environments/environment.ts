// Relative base URL: in development the Angular dev server proxies /api to the
// HelpDesk API (see proxy.conf.json), so the browser never makes a cross-origin call.
export const environment = {
  apiBaseUrl: '/api/v1'
};
