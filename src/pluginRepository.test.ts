import { describe, expect, it } from 'vitest';
import axios, { setCsrfToken } from './axios_config';
import { normalizedPluginName, pluginProjectUrl, pluginRepository } from './pluginRepository';

describe('public plugin repository', () => {
  it('does not inherit the authenticated API client headers or credentials', () => {
    setCsrfToken('test-only-csrf');
    try {
      expect(axios.defaults.headers.common['X-XSRF-TOKEN']).toBe('test-only-csrf');
      expect(pluginRepository.defaults.withCredentials).toBe(false);
      expect(pluginRepository.defaults.withXSRFToken).toBe(false);
      expect(pluginRepository.defaults.headers.common['X-XSRF-TOKEN']).toBeUndefined();
      expect(pluginRepository.defaults.headers.common['Content-Type']).toBeUndefined();
      expect(pluginRepository.defaults.timeout).toBe(15000);
    } finally {
      setCsrfToken();
    }
  });

  it('joins project paths without double slashes and normalizes distribution names', () => {
    expect(pluginProjectUrl('https://index.example/team/prod/', 'ots-example')).toBe(
      'https://index.example/team/prod/ots-example'
    );
    expect(normalizedPluginName('OTS_Example.Plugin')).toBe('ots-example-plugin');
  });
});
