import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';

import { apiErrorMessage } from './axios_config';

function axiosError(data: unknown) {
  const response = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  } satisfies AxiosResponse;

  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response);
}

describe('apiErrorMessage', () => {
  it('uses the API error field when available', () => {
    expect(apiErrorMessage(axiosError({ error: 'Specific failure' }), 'Fallback')).toBe(
      'Specific failure'
    );
  });

  it('supports Flask-Security error responses', () => {
    expect(
      apiErrorMessage(axiosError({ response: { errors: ['Invalid credentials'] } }), 'Fallback')
    ).toBe('Invalid credentials');
  });

  it('returns a safe fallback for unknown errors', () => {
    expect(apiErrorMessage(new Error('internal detail'), 'Try again')).toBe('Try again');
  });

  it('handles network failures without an HTTP response', () => {
    expect(apiErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), 'Try again')).toBe(
      'Try again'
    );
  });

  it('accepts top-level validation messages and ignores non-renderable errors', () => {
    expect(apiErrorMessage(axiosError({ errors: ['Invalid package'] }), 'Fallback')).toBe(
      'Invalid package'
    );
    expect(apiErrorMessage(axiosError({ error: { detail: 'Internal' } }), 'Fallback')).toBe(
      'Fallback'
    );
  });
});
