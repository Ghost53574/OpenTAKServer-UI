import type { ReactNode } from 'react';
import { Alert, Button, Center, Loader, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconDatabaseOff } from '@tabler/icons-react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <Center mih={240} role="status" aria-live="polite">
      <Stack align="center" gap="sm">
        <Loader />
        <Text c="dimmed">{label}</Text>
      </Stack>
    </Center>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Center mih={240}>
      <Stack align="center" gap="sm" ta="center" maw={460}>
        <ThemeIcon variant="light" size={52} radius="xl">
          <IconDatabaseOff size={28} />
        </ThemeIcon>
        <Text fw={700}>{title}</Text>
        <Text c="dimmed" size="sm">
          {description}
        </Text>
        {action}
      </Stack>
    </Center>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert color="red" icon={<IconAlertCircle />} title={title} role="alert">
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{message}</Text>
        {onRetry ? (
          <Button variant="light" color="red" size="xs" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
}
