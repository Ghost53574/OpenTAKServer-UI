import { expect, test } from '@playwright/test';

// Exercise the built chunks, not Vite's development module loader. Responses
// model the existing Flask API; these tests don't change the server contract.
const user = {
  id: 1,
  username: 'operator',
  email: null,
  active: true,
  roles: [{ id: 1, name: 'administrator' }],
  token: 'test-token',
  euds: [],
  groups: [],
  group_memberships: [],
  video_streams: [],
};
const collection = { results: [], total: 0, total_pages: 0, current_page: 1, per_page: 10 };
const status = {
  online_euds: 0,
  system_boot_time: '2026-10-08T00:00:00Z',
  system_uptime: 3600,
  ots_start_time: '2026-10-08T00:00:00Z',
  ots_uptime: 3600,
  cpu_percent: 5,
  load_avg: [0, 0, 0],
  memory: { total: 1000, available: 900, used: 100, free: 900, percent: 10 },
  disk_usage: { total: 1000, used: 100, free: 900, percent: 10 },
  ots_version: '1.7.1',
  python_version: '3.14',
  uname: { system: 'Linux', node: 'test', release: 'test', version: 'test', machine: 'x86_64' },
  os_release: { PRETTY_NAME: 'Debian' },
};

async function mockApi(page, { anonymous = false, failed = false } = {}) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    let data = collection;
    let code = 200;
    if (p === '/api/me') {
      data = anonymous ? { error: 'Unauthorized' } : user;
      code = anonymous ? 401 : 200;
    } else if (p === '/api/language') data = { US: { name: 'English', language_code: 'en' } };
    else if (p === '/api/login')
      data = { response: { identity_attributes: ['username'], csrf_token: 'csrf-test' } };
    else if (failed) return route.abort('failed');
    else if (p === '/api/status') data = status;
    else if (p === '/api/map_state') data = { euds: [], markers: [], rb_lines: [], casevacs: [] };
    else if (p === '/api/plugins') data = { success: true, plugins: [] };
    else if (p === '/api/plugins/repo')
      data = { success: true, repo_url: 'https://repo.opentakserver.io/brian/prod/' };
    // Optional project URLs are deliberately absent to cover plugin metadata.
    else if (p === '/api/plugins/test-plugin')
      data = { name: 'test-plugin', enabled: true, description: 'Test plugin', version: '1.0.0' };
    else if (p === '/api/plugins/test-plugin/config') data = {};
    else if (p === '/api/plugins/test-plugin/ui') data = false;
    else if (p === '/api/scheduler/jobs' || p.endsWith('/all') || p === '/api/takgov/plugins')
      data = [];
    else if (p === '/api/eud') data = collection;
    else if (p === '/api/users')
      data = { ...collection, results: [user], total: 1, total_pages: 1 };
    else if (p === '/api/tf-setup') data = { response: { tf_primary_method: 'none' } };
    else if (p === '/api/takgov') data = { tak_gov_account_linked: false };
    else if (p === '/api/itak_qr_string') data = 'test-qr';
    else if (p === '/api/atak_qr_string') data = { qr_string: 'test-qr' };
    return route.fulfill({ status: code, json: data });
  });
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('https://repo.opentakserver.io/**', (route) =>
    route.fulfill({ json: { result: { projects: [] } } })
  );
  await page.route('https://*.tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    })
  );
}

async function assertLoaded(page, path, options) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockApi(page, options);
  await page.goto(path);
  if (options?.anonymous) {
    await expect(page.getByRole('button', { name: /log in|sign in|login/i }).first()).toBeVisible();
  } else {
    await expect(
      page.getByRole('button', { name: 'Open account menu for operator' })
    ).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
  }
  // Allow route imports, effects, and rejected promises to finish before
  // checking for secondary runtime errors (including undefined .response).
  await page.waitForTimeout(750);
  expect(errors).toEqual([]);
  if (!options?.failed) {
    await expect(
      page.getByText('The request failed. Please try again.', { exact: true })
    ).toHaveCount(0);
  }
}

test('production login initializes vendor chunks', async ({ page }) => {
  await assertLoaded(page, '/login', { anonymous: true });
});

for (const path of [
  '/dashboard',
  '/activity',
  '/certificates',
  '/map',
  '/euds',
  '/alerts',
  '/casevac',
  '/data_packages',
  '/video_streams',
  '/users',
  '/tfa_setup',
  '/jobs',
  '/video_recordings',
  '/meshtastic',
  '/plugin_updates',
  '/device_profiles',
  '/missions',
  '/groups',
  '/eud_stats',
  '/plugin',
  '/plugin?name=test-plugin',
  '/server_plugin_manager',
  '/link_account',
  '/profile',
  '/profile/',
]) {
  test(`production route ${path} loads without runtime errors`, async ({ page }) => {
    await assertLoaded(page, path);
    if (path === '/plugin') await expect(page).toHaveURL(/\/server_plugin_manager$/);
  });
}

for (const path of [
  '/euds',
  '/data_packages',
  '/users',
  '/jobs',
  '/missions',
  '/device_profiles',
  '/server_plugin_manager',
  '/plugin?name=test-plugin',
]) {
  test(`network failures on ${path} don't cause undefined errors`, async ({ page }) => {
    await assertLoaded(page, path, { failed: true });
    await expect(
      page.getByText('The request failed. Please try again.', { exact: true }).first()
    ).toBeVisible();
  });
}

test('failed device-profile submission reports the request error, not the click event', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await assertLoaded(page, '/device_profiles');
  await page.route('**/api/profiles', (route) =>
    route.request().method() === 'POST' ? route.abort() : route.fallback()
  );
  await page.getByRole('button', { name: 'Add Device Profile' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/^Key/).fill('test-preference');
  await dialog.getByLabel(/^Value(?:\s*\*)?$/).fill('test-value');
  await dialog.getByRole('button', { name: 'Add Device Profile' }).click();
  await expect(
    page.getByText('The request failed. Please try again.', { exact: true })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('plugin catalog is explicitly loaded from the configured index without API headers', async ({
  page,
}) => {
  await mockApi(page);
  let catalogRequests = 0;
  let upstreamRequests = 0;
  page.on('request', (request) => {
    if (request.url().startsWith('https://repo.opentakserver.io/')) upstreamRequests += 1;
  });
  await page.route('**/api/plugins/repo', (route) =>
    route.fulfill({
      json: {
        success: true,
        enabled: true,
        repo_url: 'https://plugins.example.test/custom/prod/',
      },
    })
  );
  await page.route('**/api/plugins', (route) =>
    route.fulfill({
      json: {
        success: true,
        plugins: [{ name: 'AISStream', distro: 'OTS_AISStream_Plugin', routes: [] }],
      },
    })
  );
  await page.route('https://plugins.example.test/**', async (route) => {
    catalogRequests += 1;
    const headers = await route.request().allHeaders();
    expect(headers['x-xsrf-token']).toBeUndefined();
    expect(headers['content-type']).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    if (route.request().url().endsWith('/ots-skyfi-plugin')) {
      return route.fulfill({
        json: {
          result: {
            '1.0.0': {
              name: 'SkyFi',
              summary: 'SkyFi imagery',
              description: 'Creates data packages from imagery orders.',
              version: '1.0.0',
            },
          },
        },
      });
    }
    return route.fulfill({
      json: { result: { projects: ['ots-aisstream-plugin', 'ots-skyfi-plugin'] } },
    });
  });
  await page.goto('/server_plugin_manager');
  const browse = page.getByRole('button', { name: 'Browse Available Plugins' });
  await expect(browse).toBeEnabled();
  expect(catalogRequests).toBe(0);
  expect(upstreamRequests).toBe(0);
  await browse.click();
  await expect(page.getByText('ots-skyfi-plugin', { exact: true })).toBeVisible();
  await expect(page.getByText('ots-aisstream-plugin', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh Plugin Catalog' }).click();
  await expect(page.getByText('ots-skyfi-plugin', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('cell', { name: 'AISStream', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Show info for ots-skyfi-plugin' }).click();
  await expect(
    page.getByRole('dialog').getByText('Creates data packages from imagery orders.')
  ).toBeVisible();
  expect(upstreamRequests).toBe(0);
});

test('unavailable optional catalog preserves installed plugins and can be retried', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/api/plugins', (route) =>
    route.fulfill({
      json: {
        success: true,
        plugins: [{ name: 'Existing plugin', distro: 'ots_existing', routes: [] }],
      },
    })
  );
  await page.route('https://repo.opentakserver.io/**', (route) => route.abort('failed'));
  await page.goto('/server_plugin_manager');
  await page.getByRole('button', { name: 'Browse Available Plugins' }).click();
  await expect(page.getByText('Plugin catalog unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Existing plugin', exact: true })).toBeVisible();
  await page.route('https://repo.opentakserver.io/**', (route) =>
    route.fulfill({ json: { result: { projects: [] } } })
  );
  await page.getByRole('button', { name: 'Retry Plugin Catalog' }).click();
  await expect(page.getByText('Plugin catalog unavailable', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('No plugins are available in the configured repository.')
  ).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Existing plugin', exact: true })).toBeVisible();
});

test('disabled server plugins show their configuration state without index requests', async ({
  page,
}) => {
  await mockApi(page);
  let requests = 0;
  await page.route('https://repo.opentakserver.io/**', (route) => {
    requests += 1;
    return route.abort();
  });
  await page.route('**/api/plugins/repo', (route) =>
    route.fulfill({
      json: {
        success: true,
        enabled: false,
        repo_url: 'https://repo.opentakserver.io/brian/prod/',
      },
    })
  );
  await page.goto('/server_plugin_manager');
  await expect(page.getByText('Server plugins are disabled', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Browse Available Plugins' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Upload Plugin', exact: true })).toBeDisabled();
  expect(requests).toBe(0);
});

for (const [path, button, label] of [
  ['/device_profiles', 'Add Device Profile', 'Callsign'],
  ['/missions', 'New Mission', 'Creator'],
]) {
  test(`device selector on ${path} includes subsequent pages and unnamed devices`, async ({
    page,
  }) => {
    await mockApi(page);
    await page.route('**/api/eud?*', (route) => {
      const pageNumber = new URL(route.request().url()).searchParams.get('page');
      return route.fulfill({
        json: {
          ...collection,
          total: 2,
          total_pages: 2,
          results:
            pageNumber === '2'
              ? [{ uid: 'second-page-device', callsign: null }]
              : [{ uid: 'one', callsign: 'First Page Device' }],
        },
      });
    });
    await page.goto(path);
    await page.getByRole('button', { name: button, exact: true }).click();
    const select = page.getByRole('dialog').getByLabel(new RegExp(`^${label}`));
    await select.fill('second-page-device');
    await page.getByRole('option', { name: 'second-page-device', exact: true }).click();
    await expect(select).toHaveValue('second-page-device');
    await expect(
      page.getByText('The request failed. Please try again.', { exact: true })
    ).toHaveCount(0);
  });
}
