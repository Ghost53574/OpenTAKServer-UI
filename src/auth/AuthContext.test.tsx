import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../test-utils';
import axios from '../axios_config';
import { AuthProvider, useAuth } from './AuthContext';

const administrator = {
  id: 7,
  username: 'operator',
  email: 'operator@example.test',
  active: true,
  roles: [{ id: 1, name: 'administrator' }],
  token: 'in-memory-token',
};

function AuthProbe() {
  const { status, user, isAdministrator, logout } = useAuth();
  return (
    <div>
      <span>{status}</span>
      <span>{user?.username ?? 'no user'}</span>
      <span>{isAdministrator ? 'administrator' : 'standard user'}</span>
      <button type="button" onClick={() => void logout()}>
        Log out
      </button>
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('AuthProvider', () => {
  it('restores the server session and derives administrator access from roles', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: administrator });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(await screen.findByText('authenticated')).toBeInTheDocument();
    expect(screen.getByText('operator')).toBeInTheDocument();
    expect(screen.getByText('administrator')).toBeInTheDocument();
  });

  it('clears legacy credentials on logout without deleting browser preferences', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: administrator });
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } });
    localStorage.setItem('token', 'legacy-token');
    localStorage.setItem('country', 'US');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await screen.findByText('authenticated');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('country')).toBe('US');
  });
});
