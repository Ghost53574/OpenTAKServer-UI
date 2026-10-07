import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Group,
  Modal,
  NavLink,
  NumberInput,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  Icon2fa,
  IconBook,
  IconBrandDiscord,
  IconBrandGithub,
  IconCircleMinus,
  IconHelp,
  IconMoonStars,
  IconPlugConnected,
  IconQrcode,
  IconRefresh,
  IconSearch,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { formatISO, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { QRCode } from 'react-qrcode-logo';

import { apiRoutes } from '../../apiRoutes';
import { useAuth } from '../../auth/AuthContext';
import axios, { apiErrorMessage } from '../../axios_config';
import Logo from '../../images/ots-logo.png';
import { navigationSections } from '../../navigation';
import DarkModeSwitch from '../DarkModeSwitch';
import classes from './Navbar.module.css';

interface NavbarProps {
  onNavigate?: () => void;
}

interface ATAKQrCode {
  qr_string: string;
  sub: string;
  iat: number;
  iss: string;
  aud: string;
  max: number | string;
  nbf: number | null;
  exp: number | null;
  disabled: boolean;
  total_uses: number;
}

interface ServerPlugin {
  distro: string;
  name: string;
}

const emptyAtakQr: ATAKQrCode = {
  qr_string: '',
  sub: '',
  iat: 0,
  iss: '',
  aud: '',
  max: '',
  nbf: null,
  exp: null,
  disabled: false,
  total_uses: 0,
};

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const { t } = useTranslation();
  const { isAdministrator } = useAuth();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [showItakQr, setShowItakQr] = useState(false);
  const [itakQrString, setItakQrString] = useState('');
  const [showAtakQr, setShowAtakQr] = useState(false);
  const [atakQr, setAtakQr] = useState<ATAKQrCode>(emptyAtakQr);
  const [plugins, setPlugins] = useState<ServerPlugin[]>([]);

  useEffect(() => {
    if (!isAdministrator) {
      setPlugins([]);
      return;
    }

    axios
      .get(apiRoutes.plugins)
      .then((response) => setPlugins(response.data.plugins ?? []))
      .catch(() => setPlugins([]));
  }, [isAdministrator]);

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return navigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.administratorOnly && !isAdministrator) {
            return false;
          }

          return (
            !normalizedQuery ||
            t(item.label).toLocaleLowerCase().includes(normalizedQuery) ||
            t(item.description).toLocaleLowerCase().includes(normalizedQuery)
          );
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [isAdministrator, query, t]);

  const getItakQr = async () => {
    try {
      const response = await axios.get(apiRoutes.itakQrString);
      setItakQrString(response.data);
      setShowItakQr(true);
    } catch (error) {
      notifications.show({
        title: t('Unable to create iTAK connection'),
        message: apiErrorMessage(error, t('Failed to get QR code string')),
        icon: <IconX />,
        color: 'red',
      });
    }
  };

  const getAtakQr = async () => {
    setShowAtakQr(true);
    try {
      const response = await axios.get<ATAKQrCode>(apiRoutes.atakQrString);
      setAtakQr(response.data);
    } catch {
      setAtakQr(emptyAtakQr);
    }
  };

  const generateAtakQr = async () => {
    try {
      const response = await axios.post<ATAKQrCode>(apiRoutes.atakQrString, atakQr);
      setAtakQr(response.data);
    } catch (error) {
      notifications.show({
        title: t('Failed to generate QR code'),
        message: apiErrorMessage(error, t('The enrollment token could not be generated.')),
        icon: <IconX />,
        color: 'red',
      });
    }
  };

  const deleteAtakQr = async () => {
    try {
      await axios.delete(apiRoutes.atakQrString);
      setAtakQr(emptyAtakQr);
    } catch (error) {
      notifications.show({
        title: t('Failed to delete QR code'),
        message: apiErrorMessage(error, t('The enrollment token could not be deleted.')),
        icon: <IconX />,
        color: 'red',
      });
    }
  };

  return (
    <Stack h="100%" gap={0}>
      <Box p="sm" pb={4}>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t('Find a page')}
          aria-label={t('Find a page')}
          leftSection={<IconSearch size={16} />}
          rightSection={
            query ? (
              <Button variant="subtle" size="compact-xs" onClick={() => setQuery('')}>
                ×
              </Button>
            ) : null
          }
        />
      </Box>

      <ScrollArea className={classes.scrollArea} type="auto" scrollbarSize={6}>
        <Stack gap="lg" p="sm">
          {visibleSections.map((section) => (
            <Box key={section.label}>
              <Text className={classes.sectionLabel}>{t(section.label)}</Text>
              <Stack gap={3} mt={6}>
                {section.items.map((item) => (
                  <NavLink
                    className={classes.link}
                    component={Link}
                    key={item.path}
                    active={location.pathname === item.path}
                    to={item.path}
                    label={t(item.label)}
                    description={t(item.description)}
                    leftSection={<item.icon className={classes.linkIcon} stroke={1.7} />}
                    onClick={onNavigate}
                  />
                ))}
              </Stack>
            </Box>
          ))}

          {isAdministrator && plugins.length > 0 ? (
            <Box>
              <Text className={classes.sectionLabel}>{t('Plugins')}</Text>
              <Stack gap={3} mt={6}>
                {plugins.map((plugin) => (
                  <NavLink
                    className={classes.link}
                    component={Link}
                    key={plugin.distro}
                    active={location.pathname + location.search === `/plugin?name=${plugin.distro}`}
                    to={`/plugin?name=${plugin.distro}`}
                    label={plugin.name}
                    leftSection={<IconPlugConnected className={classes.linkIcon} stroke={1.7} />}
                    onClick={onNavigate}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}

          {visibleSections.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {t('No pages match your search.')}
            </Text>
          ) : null}
        </Stack>
      </ScrollArea>

      <Box className={classes.footer} p="sm">
        <NavLink
          className={classes.compactLink}
          label={t('Connect a TAK device')}
          leftSection={<IconQrcode size={20} />}
          childrenOffset={30}
        >
          <NavLink label={t('ATAK enrollment QR')} onClick={() => void getAtakQr()} />
          <NavLink label={t('iTAK connection QR')} onClick={() => void getItakQr()} />
          <NavLink
            label={t('Download truststore')}
            onClick={() => openExternal(apiRoutes.truststore)}
          />
        </NavLink>
        <NavLink
          className={classes.compactLink}
          component={Link}
          to="/tfa_setup"
          label={t('Two-factor authentication')}
          leftSection={<Icon2fa size={20} />}
          onClick={onNavigate}
        />
        <NavLink
          className={classes.compactLink}
          label={t('Appearance')}
          leftSection={<IconMoonStars size={20} />}
          rightSection={<DarkModeSwitch />}
        />
        <NavLink
          className={classes.compactLink}
          label={t('Help and support')}
          leftSection={<IconHelp size={20} />}
        >
          <NavLink
            label={t('Documentation')}
            leftSection={<IconBook size={17} />}
            onClick={() => openExternal('https://docs.opentakserver.io')}
          />
          <NavLink
            label="Discord"
            leftSection={<IconBrandDiscord size={17} />}
            onClick={() => openExternal('https://discord.gg/6uaVHjtfXN')}
          />
          <NavLink
            label="GitHub"
            leftSection={<IconBrandGithub size={17} />}
            onClick={() => openExternal('https://github.com/Ghost53574/OpenTAK')}
          />
        </NavLink>
        <NavLink
          className={classes.compactLink}
          component={Link}
          to="/profile"
          label={t('Profile')}
          leftSection={<IconUser size={20} />}
          onClick={onNavigate}
        />
      </Box>

      <Modal
        opened={showItakQr}
        onClose={() => setShowItakQr(false)}
        title={t('iTAK Connection Details')}
        centered
      >
        <Center>
          <Paper p="md" shadow="xl" withBorder bg="white">
            <QRCode
              size={260}
              value={itakQrString}
              quietZone={10}
              logoImage={Logo}
              qrStyle="dots"
              ecLevel="H"
              eyeRadius={40}
              logoWidth={72}
              logoHeight={72}
            />
          </Paper>
        </Center>
      </Modal>

      <Modal
        opened={showAtakQr}
        onClose={() => setShowAtakQr(false)}
        title={t('ATAK enrollment')}
        centered
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {t(
              'Create a limited enrollment token. Anyone with this QR code can enroll until it expires or reaches its use limit.'
            )}
          </Text>
          <DateTimePicker
            onChange={(date) => {
              if (date !== 'Invalid Date' && date !== null) {
                setAtakQr({ ...atakQr, exp: Math.floor(parseISO(date).getTime() / 1000) });
              }
            }}
            minDate={new Date()}
            valueFormat="YYYY-MM-DD HH:mm:ss ZZ"
            value={atakQr.exp !== null ? formatISO(new Date(atakQr.exp * 1000)) : null}
            disabled={atakQr.qr_string !== ''}
            label={t('Expiration date')}
            clearable
            firstDayOfWeek={0}
            clearButtonProps={{ onClick: () => setAtakQr({ ...atakQr, exp: null }) }}
            timePickerProps={{
              withDropdown: true,
              popoverProps: { withinPortal: false },
              format: '24h',
            }}
          />
          <NumberInput
            hideControls
            min={1}
            value={atakQr.max}
            disabled={atakQr.qr_string !== ''}
            label={t('Maximum uses')}
            onChange={(value) => setAtakQr({ ...atakQr, max: Number(value) || '' })}
          />
          {Number(atakQr.max) > 0 && atakQr.qr_string !== '' ? (
            <NumberInput value={atakQr.total_uses} disabled label={t('Uses so far')} />
          ) : null}

          <Group justify="center">
            <Button
              onClick={() => void generateAtakQr()}
              disabled={atakQr.qr_string !== ''}
              leftSection={<IconRefresh size={16} />}
            >
              {t('Generate')}
            </Button>
            <Button
              variant="light"
              color="red"
              onClick={() => void deleteAtakQr()}
              disabled={atakQr.qr_string === ''}
              leftSection={<IconCircleMinus size={16} />}
            >
              {t('Revoke')}
            </Button>
          </Group>

          {atakQr.qr_string ? (
            <>
              <Divider />
              <Flex direction="column" gap="md" align="center">
                <Paper p="md" shadow="sm" withBorder bg="white">
                  <QRCode
                    size={260}
                    value={atakQr.qr_string}
                    quietZone={10}
                    logoImage={Logo}
                    eyeRadius={40}
                    ecLevel="L"
                    qrStyle="dots"
                    logoWidth={72}
                    logoHeight={72}
                  />
                </Paper>
                <Tooltip label={t("Use this only on the Android device you're enrolling")}>
                  <Button
                    component="a"
                    href={atakQr.qr_string}
                    leftSection={<IconQrcode size={16} />}
                  >
                    {t('Open in ATAK')}
                  </Button>
                </Tooltip>
                <Text ta="center" fw={600} size="sm">
                  {t('Treat this QR code like a password. Revoke it when enrollment is complete.')}
                </Text>
              </Flex>
            </>
          ) : null}
        </Stack>
      </Modal>
    </Stack>
  );
}
