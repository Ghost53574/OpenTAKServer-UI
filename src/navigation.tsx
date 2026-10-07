import type { ComponentType } from 'react';
import type { IconProps } from '@tabler/icons-react';
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconCalendarDue,
  IconCertificate,
  IconDashboard,
  IconDeviceMobile,
  IconHeartbeat,
  IconLink,
  IconMap,
  IconMovie,
  IconPackage,
  IconPlugConnected,
  IconPuzzle,
  IconRefresh,
  IconUsers,
  IconUsersGroup,
  IconVideo,
} from '@tabler/icons-react';

import MeshtasticLogo from './components/Navbar/MeshtasticLogo';

type NavigationIcon = ComponentType<IconProps> | typeof MeshtasticLogo;

export interface NavigationItem {
  path: string;
  label: string;
  description: string;
  icon: NavigationIcon;
  administratorOnly?: boolean;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    label: 'Operations',
    items: [
      {
        path: '/dashboard',
        label: 'Dashboard',
        description: 'Server and service health',
        icon: IconDashboard,
      },
      { path: '/map', label: 'Live map', description: 'Current TAK picture', icon: IconMap },
      {
        path: '/euds',
        label: 'Devices',
        description: 'Connected and known EUDs',
        icon: IconDeviceMobile,
      },
      {
        path: '/activity',
        label: 'CoT activity',
        description: 'Recent Cursor on Target traffic',
        icon: IconActivityHeartbeat,
      },
      {
        path: '/alerts',
        label: 'Alerts',
        description: 'Emergency and canceled alerts',
        icon: IconAlertTriangle,
      },
      {
        path: '/casevac',
        label: 'CasEvac',
        description: 'Casualty evacuation records',
        icon: IconHeartbeat,
      },
    ],
  },
  {
    label: 'Collaboration',
    items: [
      {
        path: '/missions',
        label: 'Missions',
        description: 'Mission subscriptions and invitations',
        icon: IconRefresh,
      },
      {
        path: '/data_packages',
        label: 'Data packages',
        description: 'Shared mission content',
        icon: IconPackage,
      },
      {
        path: '/video_streams',
        label: 'Video streams',
        description: 'Live video sources',
        icon: IconVideo,
      },
      {
        path: '/video_recordings',
        label: 'Recordings',
        description: 'Recorded video archive',
        icon: IconMovie,
      },
      {
        path: '/certificates',
        label: 'Certificates',
        description: 'TAK client credentials',
        icon: IconCertificate,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        path: '/meshtastic',
        label: 'Meshtastic',
        description: 'LoRa bridge channels',
        icon: MeshtasticLogo,
        administratorOnly: true,
      },
      {
        path: '/users',
        label: 'Users',
        description: 'Accounts and roles',
        icon: IconUsers,
        administratorOnly: true,
      },
      {
        path: '/groups',
        label: 'Groups',
        description: 'IN and OUT membership',
        icon: IconUsersGroup,
        administratorOnly: true,
      },
      {
        path: '/jobs',
        label: 'Scheduled jobs',
        description: 'Background maintenance',
        icon: IconCalendarDue,
        administratorOnly: true,
      },
      {
        path: '/plugin_updates',
        label: 'ATAK packages',
        description: 'Client plugin repository',
        icon: IconPuzzle,
        administratorOnly: true,
      },
      {
        path: '/device_profiles',
        label: 'Device profiles',
        description: 'Enrollment preferences',
        icon: IconDeviceMobile,
        administratorOnly: true,
      },
      {
        path: '/server_plugin_manager',
        label: 'Server plugins',
        description: 'Server-side extensions',
        icon: IconPlugConnected,
        administratorOnly: true,
      },
      {
        path: '/link_account',
        label: 'TAK.gov',
        description: 'TAK.gov account and imports',
        icon: IconLink,
        administratorOnly: true,
      },
    ],
  },
];

export const navigationItems = navigationSections.flatMap((section) => section.items);

export function routeDetails(pathname: string) {
  return navigationItems.find((item) => item.path === pathname);
}
