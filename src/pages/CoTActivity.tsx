import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Code,
  CopyButton,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy, IconFilter, IconRefresh, IconX } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';

import { apiRoutes } from '../apiRoutes';
import axios, { apiErrorMessage } from '../axios_config';
import { ErrorState } from '../components/layout/AsyncState';
import { PageHeader } from '../components/layout/PageHeader';

interface CoTRecord {
  how: string | null;
  type: string | null;
  uid: string;
  sender_callsign: string | null;
  sender_uid: string | null;
  recipients: unknown[] | null;
  timestamp: string;
  start: string;
  stale: string;
  xml: string;
}

interface CoTResponse {
  results: CoTRecord[];
  total?: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

const pageSizes = [10, 25, 50, 100];

function displayTimestamp(value: string | null | undefined) {
  if (!value) return '—';
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

export default function CoTActivity() {
  const [records, setRecords] = useState<CoTRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CoTRecord | null>(null);
  const [filters, setFilters] = useState({
    sender_callsign: '',
    sender_uid: '',
    type: '',
    how: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get<CoTResponse>(apiRoutes.cot, {
        params: {
          page,
          per_page: pageSize,
          ...Object.fromEntries(Object.entries(appliedFilters).filter(([, value]) => value.trim())),
        },
      });
      setRecords(response.data.results);
      setTotal(response.data.total ?? response.data.total_pages * response.data.per_page);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'The recent CoT activity could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const empty = { sender_callsign: '', sender_uid: '', type: '', how: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="CoT activity"
        description="Inspect recent Cursor on Target events received from TAK clients and server integrations."
        actions={
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void loadRecords()}
            loading={loading}
          >
            Refresh
          </Button>
        }
      />

      <Paper withBorder radius="md" p="md" mb="lg">
        <Stack gap="sm">
          <Group grow align="flex-end">
            <TextInput
              label="Callsign"
              placeholder="Exact sender callsign"
              value={filters.sender_callsign}
              onChange={(event) =>
                setFilters({ ...filters, sender_callsign: event.currentTarget.value })
              }
            />
            <TextInput
              label="Sender UID"
              placeholder="Exact device UID"
              value={filters.sender_uid}
              onChange={(event) =>
                setFilters({ ...filters, sender_uid: event.currentTarget.value })
              }
            />
            <TextInput
              label="CoT type"
              placeholder="For example a-f-G-U-C"
              value={filters.type}
              onChange={(event) => setFilters({ ...filters, type: event.currentTarget.value })}
            />
            <TextInput
              label="How"
              placeholder="For example m-g"
              value={filters.how}
              onChange={(event) => setFilters({ ...filters, how: event.currentTarget.value })}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" leftSection={<IconX size={16} />} onClick={clearFilters}>
              Clear
            </Button>
            <Button leftSection={<IconFilter size={16} />} onClick={applyFilters}>
              Apply filters
            </Button>
          </Group>
        </Stack>
      </Paper>

      {error ? <ErrorState message={error} onRetry={() => void loadRecords()} /> : null}
      {!error ? (
        <DataTable
          withTableBorder
          borderRadius="md"
          shadow="sm"
          striped
          highlightOnHover
          records={records}
          fetching={loading}
          noRecordsText="No CoT events match these filters"
          columns={[
            {
              accessor: 'sender_callsign',
              title: 'Sender',
              render: (record) => record.sender_callsign || 'Unknown',
            },
            {
              accessor: 'type',
              title: 'Type',
              render: (record) => <Badge variant="light">{record.type || 'Unknown'}</Badge>,
            },
            { accessor: 'how', title: 'How', render: (record) => <Code>{record.how || '—'}</Code> },
            { accessor: 'uid', title: 'Event UID', ellipsis: true },
            {
              accessor: 'timestamp',
              title: 'Received',
              render: (record) => displayTimestamp(record.timestamp),
            },
          ]}
          onRowClick={({ record }) => setSelected(record)}
          page={page}
          onPageChange={setPage}
          totalRecords={total}
          recordsPerPage={pageSize}
          onRecordsPerPageChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
          recordsPerPageOptions={pageSizes}
          minHeight={240}
        />
      ) : null}

      <Drawer
        opened={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.sender_callsign || selected?.uid || 'CoT event'}
        position="right"
        size="xl"
      >
        {selected ? (
          <Stack>
            <Group gap="xs">
              <Badge>{selected.type || 'Unknown type'}</Badge>
              <Badge color="gray" variant="light">
                {selected.how || 'Unknown how'}
              </Badge>
            </Group>
            <Text size="sm">
              <strong>Event UID:</strong> {selected.uid}
            </Text>
            <Text size="sm">
              <strong>Sender UID:</strong> {selected.sender_uid || 'Unknown'}
            </Text>
            <Text size="sm">
              <strong>Received:</strong> {displayTimestamp(selected.timestamp)}
            </Text>
            <Group justify="space-between">
              <Text fw={700}>Raw CoT XML</Text>
              <CopyButton value={selected.xml}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy XML'}>
                    <Button
                      variant="subtle"
                      size="xs"
                      color={copied ? 'teal' : 'blue'}
                      leftSection={copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                      onClick={copy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
            <ScrollArea h={420} type="auto">
              <Code block>{selected.xml}</Code>
            </ScrollArea>
          </Stack>
        ) : null}
      </Drawer>
    </>
  );
}
