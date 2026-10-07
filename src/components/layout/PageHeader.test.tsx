import { screen } from '@testing-library/react';
import { Button } from '@mantine/core';
import { describe, expect, it } from 'vitest';

import { render } from '../../../test-utils';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders a page title, description, and actions', () => {
    render(
      <PageHeader
        title="Device operations"
        description="Manage connected TAK clients"
        actions={<Button>Refresh</Button>}
      />
    );

    expect(screen.getByRole('heading', { name: 'Device operations' })).toBeInTheDocument();
    expect(screen.getByText('Manage connected TAK clients')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
