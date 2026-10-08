import Axios from 'axios';

// The public index is a separate origin. Never attach server credentials or
// CSRF headers, or require credentialed CORS, when reading its metadata.
export const pluginRepository = Axios.create({
  withCredentials: false,
  withXSRFToken: false,
  headers: { Accept: 'application/json' },
  timeout: 15000,
});

export function pluginProjectUrl(repository: string, project: string) {
  return `${repository.replace(/\/+$/, '')}/${encodeURIComponent(project)}`;
}

export function normalizedPluginName(name: string) {
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}
