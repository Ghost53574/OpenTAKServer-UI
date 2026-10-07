import { describe, expect, it } from 'vitest';

import { navigationItems, navigationSections, routeDetails } from './navigation';

describe('navigation configuration', () => {
  it('uses unique paths and labels', () => {
    expect(new Set(navigationItems.map((item) => item.path)).size).toBe(navigationItems.length);
    expect(new Set(navigationItems.map((item) => item.label)).size).toBe(navigationItems.length);
  });

  it('keeps administrative links in the administration section', () => {
    const administration = navigationSections.find((section) => section.label === 'Administration');
    expect(administration).toBeDefined();
    expect(administration?.items.every((item) => item.administratorOnly)).toBe(true);
  });

  it('returns details for the active route', () => {
    expect(routeDetails('/activity')?.label).toBe('CoT activity');
    expect(routeDetails('/not-a-route')).toBeUndefined();
  });
});
