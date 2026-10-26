// Production build (Azure Static Web Apps) calls the API on Azure App Service directly;
// the API allows this origin via its Cors:AllowedOrigins setting.
export const environment = {
  apiBaseUrl: 'https://helpdesk-api-sttallev99.azurewebsites.net/api/v1'
};
