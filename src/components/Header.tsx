import React from 'react';
import {
  Group,
  Button,
  Box,
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
  Image,
} from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import cx from 'clsx';

import { useNavigate } from 'react-router';
import Logo from '../images/ots-logo.png';
import classes from './Header.module.css';
import { useAuth } from '../auth/AuthContext';

export const Header = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const { status, logout } = useAuth();

  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box pb={0} bg={computedColorScheme === 'light' ? 'white' : 'dark.7'}>
      <header className={classes.header}>
        <Group justify="space-between" h="100%">
          <Image src={Logo} h={50} w="auto" alt="OpenTAKServer" />

          <Group>
            <Button
              style={status === 'authenticated' ? { display: 'block' } : { display: 'none' }}
              variant="default"
              onClick={() => {
                void handleLogout();
              }}
            >
              Log Out
            </Button>
            <ActionIcon
              onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
              variant="default"
              size="xl"
              aria-label="Toggle color scheme"
            >
              <IconSun className={cx(classes.icon, classes.light)} stroke={1.5} />
              <IconMoon className={cx(classes.icon, classes.dark)} stroke={1.5} />
            </ActionIcon>
          </Group>
        </Group>
      </header>
    </Box>
  );
};

export default Header;
