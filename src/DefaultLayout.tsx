import { useEffect, useState } from 'react';
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Group,
  Image,
  Loader,
  Menu,
  rem,
  Text,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconLogout,
  IconPlugConnected,
  IconPlugConnectedX,
  IconUser,
} from '@tabler/icons-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from './auth/AuthContext';
import { AppContent } from './components/AppContent';
import Navbar from './components/Navbar/Navbar';
import Logo from './images/ots-logo.png';
import { routeDetails } from './navigation';
import { socket } from './socketio';

export function DefaultLayout() {
  const { t } = useTranslation();
  const { status, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpened, { close: closeMobile, toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const page = routeDetails(location.pathname);

  useEffect(() => {
    function onConnect() {
      setSocketConnected(true);
    }

    function onDisconnect() {
      setSocketConnected(false);
    }

    function onAlert(alert: { alert_type: string; callsign: string; cancel_time: string | null }) {
      const canceled = alert.cancel_time !== null;
      const message = `${alert.alert_type} from ${alert.callsign}${canceled ? ' canceled' : ''}`;

      if (!canceled) {
        const alertSound = new Audio('/alert.mp3');
        void alertSound.play().catch(() => undefined);
      }

      notifications.show({
        title: t('Alert'),
        message,
        color: canceled ? 'green' : 'red',
        icon: canceled ? (
          <IconCheck style={{ width: rem(20), height: rem(20) }} />
        ) : (
          <IconAlertTriangle style={{ width: rem(20), height: rem(20) }} />
        ),
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('alert', onAlert);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('alert', onAlert);
      socket.disconnect();
    };
  }, [t]);

  if (status === 'loading') {
    return (
      <Box h="100vh" display="grid" style={{ placeItems: 'center' }}>
        <Loader aria-label="Checking your session" />
      </Box>
    );
  }

  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 288,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding={{ base: 'sm', sm: 'lg' }}
    >
      <AppShell.Header
        bg={computedColorScheme === 'light' ? '#202438' : 'dark.9'}
        c="white"
        style={{ borderColor: 'transparent' }}
      >
        <Group justify="space-between" h="100%" px={{ base: 'sm', sm: 'md' }} wrap="nowrap">
          <Group h="100%" gap="sm" wrap="nowrap">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              color="white"
              aria-label={mobileOpened ? 'Close navigation' : 'Open navigation'}
            />
            <Burger
              opened={desktopOpened}
              onClick={toggleDesktop}
              visibleFrom="sm"
              size="sm"
              color="white"
              aria-label={desktopOpened ? 'Collapse navigation' : 'Expand navigation'}
            />
            <Image src={Logo} h={44} w="auto" alt="OpenTAKServer" />
            <Box visibleFrom="xs">
              <Text fw={700} lh={1.1}>
                {page ? t(page.label) : 'OpenTAKServer'}
              </Text>
              <Text size="xs" c="gray.4" lineClamp={1}>
                {page ? t(page.description) : 'TAK operations console'}
              </Text>
            </Box>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <Tooltip
              label={socketConnected ? 'Live updates connected' : 'Live updates disconnected'}
            >
              <Badge
                visibleFrom="xs"
                color={socketConnected ? 'teal' : 'orange'}
                variant="light"
                leftSection={
                  socketConnected ? (
                    <IconPlugConnected size={13} />
                  ) : (
                    <IconPlugConnectedX size={13} />
                  )
                }
              >
                {socketConnected ? 'Live' : 'Offline'}
              </Badge>
            </Tooltip>
            <Menu shadow="lg" width={220} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={`Open account menu for ${user.username}`}
                >
                  <Group gap={4} wrap="nowrap">
                    <IconUser size={18} />
                    <IconChevronDown size={13} />
                  </Group>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="sm" fw={700}>
                    {user.username}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user.email ?? 'Local account'}
                  </Text>
                </Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconUser size={16} />}
                  onClick={() => navigate('/profile')}
                >
                  {t('Profile')}
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={() => void handleLogout()}
                >
                  {t('Log Out')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        bg={computedColorScheme === 'light' ? 'gray.0' : 'dark.8'}
        style={{
          borderColor:
            computedColorScheme === 'light'
              ? 'var(--mantine-color-gray-3)'
              : 'var(--mantine-color-dark-5)',
        }}
      >
        <Navbar onNavigate={closeMobile} />
      </AppShell.Navbar>

      <AppShell.Main bg={computedColorScheme === 'light' ? 'gray.1' : 'dark.7'}>
        <Box id="main-content" component="main" tabIndex={-1} mih="calc(100vh - 64px)">
          <AppContent />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

export default DefaultLayout;
