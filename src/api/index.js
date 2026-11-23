import { createApi } from './endpoints.js';
import { createClient } from './client.js';

const baseUrl = import.meta.env?.VITE_API_URL ?? '/api'; // same-origin by default (dev proxy / reverse proxy)
let expired = () => {};
/** The auth context registers what should happen when a session can no longer be refreshed. */
export const onSessionExpired = (fn) => { expired = fn; };
export const client = createClient({ baseUrl, onSessionExpired: () => expired() });
export const api = createApi(client);
