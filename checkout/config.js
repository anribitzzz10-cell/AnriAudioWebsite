// Public checkout stays CLOSED until the production payment and database checks pass.
// Render Static Sites do not run server.cjs, so use the existing ANRI Cloud origin.
export const API_ORIGIN = 'https://anri-cloud.onrender.com';
export const CHECKOUT_ENABLED = false;
