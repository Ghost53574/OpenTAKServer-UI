import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCertificate, IconDownload, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';

import { apiRoutes } from '../apiRoutes';
import { useAuth } from '../auth/AuthContext';
import axios, { apiErrorMessage } from '../axios_config';
import { ErrorState } from '../components/layout/AsyncState';
import { PageHeader } from '../components/layout/PageHeader';

interface CertificateRecord {
  callsign: string | null;
  expiration_date: string;
  server_address: string;
  server_port: number;
  truststore_filename: string;
  user_cert_filename: string;
  data_package_filename: string | null;
  data_package_hash: string | null;
  eud_uid: string | null;
}

interface CertificateResponse {
  results: CertificateRecord[];
  total?: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

function certificateStatus(expiration: string) {
  const expirationDate = new Date(expiration);
  if (Number.isNaN(expirationDate.getTime())) return { label: 'Unknown', color: 'gray' };
  const remainingDays = (expirationDate.getTime() - Date.now()) / 86_400_000;
  if (remainingDays <= 0) return { label: 'Expired', color: 'red' };
  if (remainingDays <= 30) return { label: 'Expiring soon', color: 'orange' };
  return { label: 'Valid', color: 'teal' };
}

export default function Certificates() {
  const { user, isAdministrator } = useAuth();
  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [username, setUsername] = useState(user?.username ?? '');
  const [generating, setGenerating] = useState(false);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get<CertificateResponse>(apiRoutes.certificates, {
        params: { page, per_page: pageSize },
      });
      setRecords(response.data.results);
      setTotal(response.data.total ?? response.data.total_pages * response.data.per_page);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Certificates could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  const generateCertificate = async () => {
    setGenerating(true);
    try {
      await axios.post(apiRoutes.generate_certificate, { username: username.trim() });
      notifications.show({
        color: 'teal',
        message: `Certificate package created for ${username.trim()}`,
      });
      setGenerateOpen(false);
      await loadCertificates();
    } catch (requestError) {
      notifications.show({
        color: 'red',
        icon: <IconX />,
        title: 'Certificate generation failed',
        message: apiErrorMessage(requestError, 'The certificate package could not be generated.'),
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Review TAK client credentials and generate a downloadable connection package."
        actions={
          <>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void loadCertificates()}
              loading={loading}
            >
              Refresh
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setGenerateOpen(true)}>
              Generate certificate
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={() => void loadCertificates()} />
      ) : (
        <DataTable
          withTableBorder
          borderRadius="md"
          shadow="sm"
          striped
          highlightOnHover
          records={records}
          fetching={loading}
          noRecordsText="No certificates have been issued"
          columns={[
            {
              accessor: 'callsign',
              title: 'Callsign',
              render: (record) => record.callsign || 'Unassigned',
            },
            {
              accessor: 'eud_uid',
              title: 'Device UID',
              render: (record) => record.eud_uid || 'Not connected',
            },
            {
              accessor: 'expiration_date',
              title: 'Expiration',
              render: (record) => {
                const status = certificateStatus(record.expiration_date);
                return (
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm">{new Date(record.expiration_date).toLocaleDateString()}</Text>
                    <Badge color={status.color} variant="light">
                      {status.label}
                    </Badge>
                  </Group>
                );
              },
            },
            {
              accessor: 'server_address',
              title: 'Server',
              render: (record) => `${record.server_address}:${record.server_port}`,
            },
            {
              accessor: 'data_package_hash',
              title: '',
              textAlign: 'right',
              render: (record) =>
                record.data_package_hash ? (
                  <Button
                    component="a"
                    href={`${apiRoutes.download_data_packages}?hash=${encodeURIComponent(record.data_package_hash)}`}
                    size="xs"
                    variant="subtle"
                    leftSection={<IconDownload size={15} />}
                  >
                    Download
                  </Button>
                ) : (
                  <Text size="sm" c="dimmed">
                    Unavailable
                  </Text>
                ),
            },
          ]}
          page={page}
          onPageChange={setPage}
          totalRecords={total}
          recordsPerPage={pageSize}
          onRecordsPerPageChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
          recordsPerPageOptions={[10, 25, 50]}
          minHeight={240}
        />
      )}

      <Modal
        opened={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate TAK certificate"
        centered
      >
        <Stack>
          <IconCertificate size={38} />
          <Text size="sm" c="dimmed">
            The server will issue credentials and create a connection package in Data Packages.
          </Text>
          <TextInput
            required
            label="Username"
            value={username}
            disabled={!isAdministrator}
            onChange={(event) => setUsername(event.currentTarget.value)}
            description={
              isAdministrator
                ? 'Administrators can issue a package for another account.'
                : undefined
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={generating}
              disabled={!username.trim()}
              onClick={() => void generateCertificate()}
            >
              Generate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
