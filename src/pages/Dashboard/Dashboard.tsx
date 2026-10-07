import { useCallback, useEffect, useState } from 'react';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconActivityHeartbeat,
  IconCertificate,
  IconCpu,
  IconDatabase,
  IconDeviceMobile,
  IconMap,
  IconRefresh,
  IconServer,
} from '@tabler/icons-react';
import { formatDuration, intervalToDuration } from 'date-fns';
import { Link } from 'react-router';

import { versions } from '../../_versions';
import { apiRoutes } from '../../apiRoutes';
import axios, { apiErrorMessage } from '../../axios_config';
import bytesFormatter from '../../bytes_formatter';
import { ErrorState } from '../../components/layout/AsyncState';
import { PageHeader } from '../../components/layout/PageHeader';

interface ServerStatus {
  online_euds: number;
  system_boot_time: string;
  system_uptime: number;
  ots_start_time: string;
  ots_uptime: number;
  cpu_percent: number;
  load_avg: number[];
  memory: { total: number; available: number; used: number; free: number; percent: number };
  disk_usage: { total: number; used: number; free: number; percent: number };
  ots_version: string;
  python_version: string;
  uname: { system: string; node: string; release: string; version: string; machine: string };
  os_release: { NAME?: string; PRETTY_NAME?: string; VERSION?: string; VERSION_CODENAME?: string };
}

function formatUptime(seconds: number) {
  return (
    formatDuration(intervalToDuration({ start: 0, end: Math.max(0, seconds) * 1000 }), {
      format: ['days', 'hours', 'minutes'],
    }) || 'Less than a minute'
  );
}

function resourceColor(percent: number) {
  if (percent >= 90) return 'red';
  if (percent >= 75) return 'orange';
  return 'teal';
}

function ResourceCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  const color = resourceColor(value);
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={3}>
          <Text size="sm" c="dimmed" fw={600}>
            {title}
          </Text>
          <Text fz={30} fw={750} lh={1}>
            {Math.round(value)}%
          </Text>
        </Stack>
        <ThemeIcon size={42} radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
      <Progress value={value} color={color} mt="lg" radius="xl" />
      <Text size="xs" c="dimmed" mt="xs">
        {detail}
      </Text>
    </Card>
  );
}

const quickLinks = [
  { label: 'Open live map', path: '/map', icon: IconMap },
  { label: 'Review devices', path: '/euds', icon: IconDeviceMobile },
  { label: 'Inspect CoT activity', path: '/activity', icon: IconActivityHeartbeat },
  { label: 'Manage certificates', path: '/certificates', icon: IconCertificate },
];

export default function Dashboard() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStatus = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await axios.get<ServerStatus>(apiRoutes.status);
      setStatus(response.data);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Server status could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const interval = window.setInterval(() => void loadStatus(false), 30_000);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  return (
    <>
      <PageHeader
        title="Operations overview"
        description="Current OpenTAKServer health, resource utilization, and shortcuts for common operator tasks."
        actions={
          <Group gap="sm">
            {lastUpdated ? (
              <Text size="xs" c="dimmed">
                Updated {lastUpdated.toLocaleTimeString()}
              </Text>
            ) : null}
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              loading={loading}
              onClick={() => void loadStatus()}
            >
              Refresh
            </Button>
          </Group>
        }
      />

      {error ? <ErrorState message={error} onRetry={() => void loadStatus()} /> : null}

      {!error && loading && !status ? (
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={168} radius="lg" />
          ))}
        </SimpleGrid>
      ) : null}

      {status ? (
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }}>
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" align="flex-start">
                <Stack gap={3}>
                  <Text size="sm" c="dimmed" fw={600}>
                    Online TAK devices
                  </Text>
                  <Text fz={30} fw={750} lh={1}>
                    {status.online_euds}
                  </Text>
                </Stack>
                <ThemeIcon size={42} radius="md" variant="light" color="blue">
                  <IconDeviceMobile size={24} />
                </ThemeIcon>
              </Group>
              <Badge color="teal" variant="light" mt="lg">
                Live server count
              </Badge>
              <Text size="xs" c="dimmed" mt="xs">
                Devices currently reporting Connected
              </Text>
            </Card>
            <ResourceCard
              title="CPU utilization"
              value={status.cpu_percent}
              detail={`Load average: ${status.load_avg.map((value) => value.toFixed(2)).join(' / ')}`}
              icon={<IconCpu size={24} />}
            />
            <ResourceCard
              title="Memory utilization"
              value={status.memory.percent}
              detail={`${bytesFormatter(status.memory.used)} used of ${bytesFormatter(status.memory.total)}`}
              icon={<IconDatabase size={24} />}
            />
            <ResourceCard
              title="Disk utilization"
              value={status.disk_usage.percent}
              detail={`${bytesFormatter(status.disk_usage.free)} available of ${bytesFormatter(status.disk_usage.total)}`}
              icon={<IconServer size={24} />}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="md">
                <Title order={3}>Runtime details</Title>
                <Badge color="teal" variant="dot">
                  Operational
                </Badge>
              </Group>
              <Table verticalSpacing="sm">
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Th>OpenTAKServer</Table.Th>
                    <Table.Td>{status.ots_version}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Server uptime</Table.Th>
                    <Table.Td>{formatUptime(status.ots_uptime)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Host uptime</Table.Th>
                    <Table.Td>{formatUptime(status.system_uptime)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Host</Table.Th>
                    <Table.Td>
                      {status.uname.node} · {status.uname.machine}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Operating system</Table.Th>
                    <Table.Td>
                      {status.os_release.PRETTY_NAME ||
                        `${status.uname.system} ${status.uname.release}`}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Python</Table.Th>
                    <Table.Td>{status.python_version}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Web interface</Table.Th>
                    <Table.Td>
                      {versions.gitTag || 'Development'} ·{' '}
                      <Text span ff="monospace" size="sm">
                        {versions.gitCommitHash?.slice(0, 8) || 'local'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Title order={3} mb={4}>
                Quick actions
              </Title>
              <Text c="dimmed" size="sm" mb="md">
                Jump to common operational workflows.
              </Text>
              <Stack gap="xs">
                {quickLinks.map((item) => (
                  <Anchor key={item.path} component={Link} to={item.path} underline="never">
                    <Group gap="sm" p="sm" wrap="nowrap">
                      <ThemeIcon variant="light" radius="md">
                        <item.icon size={18} />
                      </ThemeIcon>
                      <Text fw={600} size="sm">
                        {item.label}
                      </Text>
                    </Group>
                  </Anchor>
                ))}
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      ) : null}
    </>
  );
}
