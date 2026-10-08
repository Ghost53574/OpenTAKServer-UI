import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from './axios_config';
import { getEudChoices } from './eudChoices';

afterEach(() => vi.restoreAllMocks());

describe('device choices', () => {
  it('reads all pages of the real API response and handles missing callsigns', async () => {
    const get = vi.spyOn(axios, 'get');
    get.mockResolvedValueOnce({
      data: { results: [{ uid: 'one', callsign: 'Team One' }], total_pages: 2 },
    });
    get.mockResolvedValueOnce({
      data: { results: [{ uid: 'two', callsign: null }], total_pages: 2 },
    });
    expect(await getEudChoices()).toEqual([
      { value: 'one', label: 'Team One' },
      { value: 'two', label: 'two' },
    ]);
    expect(get).toHaveBeenNthCalledWith(1, '/api/eud', { params: { page: 1, per_page: 100 } });
    expect(get).toHaveBeenNthCalledWith(2, '/api/eud', { params: { page: 2, per_page: 100 } });
  });

  it('accepts an empty server without requesting a nonexistent page', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { results: [], total_pages: 0 } });
    expect(await getEudChoices()).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
