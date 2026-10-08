import {
  Modal,
  Table,
  TableData,
  useComputedColorScheme,
  Button,
  Text,
  Divider,
  ScrollArea,
  LoadingOverlay,
  Center,
  FileInput,
  Alert,
  Group,
} from '@mantine/core';
import React, { useEffect, useState } from 'react';
import {
  IconCheck,
  IconCircleMinus,
  IconDownload,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import axios, { apiErrorMessage } from '../axios_config';
import { notifications } from '@mantine/notifications';
import { socket } from '@/socketio';
import { apiRoutes } from '../apiRoutes';
import { Link } from 'react-router';
import Markdown from 'react-markdown';
import CodeMirror from '@uiw/react-codemirror';
import { ViewPlugin } from '@codemirror/view';
import { normalizedPluginName, pluginProjectUrl, pluginRepository } from '../pluginRepository';

interface About {
  author: string;
  author_email: string;
  classifier: Array<string>;
  description: string;
  description_content_type: string;
  license: string;
  metadata_version: string;
  name: string;
  project_urls: Array<string>;
  project_url: Array<string>;
  requires_dist: Array<string>;
  requires_python: string;
  summary: string;
  version: string;
}

interface InstalledPlugin {
  distro: string;
  name: string;
  routes: [''];
}

interface CommandOutput {
  message: string;
  success: boolean;
}

interface Plugin {
  plugin_name?: string | null;
  action: string | null;
  plugin_distro?: string | null;
  plugin_file?: File | null | undefined;
  plugin_file_name?: string | null;
}

export default function ServerPluginManager() {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const [showInfo, setShowInfo] = useState(false);
  const [about, setAbout] = useState<About>({} as About);
  const [docUrl, setDocUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[] | null>(null);
  const [availablePlugins, setAvailablePlugins] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [pluginsEnabled, setPluginsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showCommandOutput, setShowCommandOutput] = useState(false);
  const [commandOutput, setCommandOutput] = useState('');
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [commandOutputTitle, setCommandOutputTitle] = useState('');
  const [refreshButtonDisabled, setRefreshButtonDisabled] = useState(true);
  const [showModelClose, setShowModelClose] = useState(false);
  const [pluginRepo, setPluginRepo] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [installingPlugin, setInstallingPlugin] = useState(false);

  function pluginPackageManager(data: CommandOutput) {
    setCommandOutput((commandOutput) => commandOutput + data.message);
    if (Object.hasOwn(data, 'success') && data.success) {
      setRefreshButtonDisabled(false);
      setInstallingPlugin(false);
      notifications.show({
        title: 'Success',
        message: `Please restart OpenTAKServer and refresh your browser`,
        icon: <IconCheck />,
        color: 'green',
      });
    } else if (Object.hasOwn(data, 'success') && !data.success) {
      setRefreshButtonDisabled(true);
      setShowModelClose(true);
      setInstallingPlugin(false);
      notifications.show({
        title: 'Error',
        message: `Check command output`,
        icon: <IconX />,
        color: 'red',
      });
    }
  }

  function pep440_gt(version1: string, version2: string) {
    const PEP440_REGEX =
      /^([0-9])\.([0-9])\.([0-9])\.?(post[0-9]+)?\.?(dev)?(a|b|rc)?(\+[0-9a-zA-Z]{7}?)/;
    if (!PEP440_REGEX.test(version1) || !PEP440_REGEX.test(version2)) {
      return false;
    } else if (version1 === version2) {
      return false;
    }

    const version1_regex = PEP440_REGEX.exec(version1);
    const version2_regex = PEP440_REGEX.exec(version2);

    if (version2_regex === null && version1_regex !== null) {
      return true;
    } else if (version1_regex === null || version2_regex === null) {
      return false;
    }

    // Major Version
    if (version1_regex[1] > version2_regex[1]) {
      return true;
    }
    // Minor Version
    else if (version1_regex[1] === version2_regex[1] && version1_regex[2] > version2_regex[2]) {
      return true;
    }
    // Patch number
    else if (
      version1_regex[1] === version2_regex[1] &&
      version1_regex[2] === version2_regex[2] &&
      version1_regex[3] > version2_regex[3]
    ) {
      return true;
    }
    // Major, minor, and patch match. Check for post
    else if (
      version1_regex[1] === version2_regex[1] &&
      version1_regex[2] === version2_regex[2] &&
      version1_regex[3] === version2_regex[3]
    ) {
      if (version1_regex[4] && !version2_regex[4]) {
        return true;
      }

      const version1_post = parseInt(version1_regex[4]?.replace('post', '') ?? '0', 10);
      const version2_post = parseInt(version2_regex[4]?.replace('post', '') ?? '0', 10);
      if (version1_post > version2_post) {
        return true;
      }
    }
    return false;
  }

  useEffect(() => {
    getPluginRepo();
    getInstalledPlugins();

    socket.on('plugin_package_manager', pluginPackageManager);

    return () => {
      socket.off('plugin_package_manager', pluginPackageManager);
    };
  }, []);

  useEffect(() => {
    setDocUrl('');
    setRepoUrl('');
    let project_urls: string[] = [];
    if (Object.hasOwn(about, 'project_urls')) {
      project_urls = about.project_urls;
    } else if (Object.hasOwn(about, 'project_url')) {
      project_urls = about.project_url;
    }

    (project_urls ?? []).forEach((value) => {
      if (value.startsWith('Documentation')) {
        setDocUrl(value.split(', ')[1]);
      } else if (value.startsWith('Repository')) {
        setRepoUrl(value.split(', ')[1]);
      }
    });
  }, [about]);

  useEffect(() => {
    if (plugin === null) return;

    if (plugin.action !== 'install_local') {
      socket.emit('plugin_package_manager', plugin);
    } else if (plugin.action === 'install_local' && plugin.plugin_file != undefined) {
      const formData = new FormData();
      formData.append('file', plugin.plugin_file);
      axios
        .post(apiRoutes.plugins, formData)
        .then((r) => {
          if (r.status === 200) {
            socket.emit('plugin_package_manager', { ...plugin, plugin_file: null });
          }
        })
        .catch((err) => {
          setInstallingPlugin(false);
          console.log(err);
          notifications.show({
            title: 'Failed to upload plugin',
            message: apiErrorMessage(err, 'The request failed. Please try again.'),
            icon: <IconX />,
            color: 'red',
          });
        });
    }
  }, [plugin]);

  function getPluginRepo() {
    axios
      .get(apiRoutes.pluginRepo)
      .then((r) => {
        if (r.status === 200) {
          setPluginRepo(r.data.repo_url);
          setPluginsEnabled(r.data.enabled !== false);
        }
      })
      .catch((err) => {
        console.log(err);
        notifications.show({
          title: 'Failed to get repo URL',
          message: apiErrorMessage(err, 'The request failed. Please try again.'),
          icon: <IconX />,
          color: 'red',
        });
      });
  }

  function getAvailablePluginInfo(pluginName: string) {
    if (!pluginRepo) return;
    setAbout({} as About);
    pluginRepository
      .get(pluginProjectUrl(pluginRepo, pluginName))
      .then((r) => {
        let metadata;
        if (r.status === 200) {
          let highestVersion: string | null = null;
          Object.entries(r.data.result).forEach(([key, value]) => {
            if (highestVersion === null) {
              highestVersion = key;
              metadata = value;
            } else if (pep440_gt(key, highestVersion)) {
              highestVersion = key;
              metadata = value;
            }
          });

          if (metadata) {
            setAbout(metadata);
          }
        }
        return metadata;
      })
      .catch((err) => {
        console.log(err);
        notifications.show({
          title: 'Failed to get plugin info',
          message: apiErrorMessage(err, 'The plugin repository could not be reached.'),
          icon: <IconX />,
          color: 'red',
        });
      });
  }

  function getInstalledPluginInfo(pluginDistro: string) {
    setAbout({} as About);
    axios
      .get(`${apiRoutes.plugins}/${pluginDistro}`)
      .then((r) => {
        if (r.status === 200) {
          setAbout(r.data);
        }
      })
      .catch((err) => {
        console.log(err);
        notifications.show({
          title: 'Failed to get plugin info',
          message: apiErrorMessage(err, 'The request failed. Please try again.'),
          icon: <IconX />,
          color: 'red',
        });
      });
  }

  function getInstalledPlugins() {
    axios
      .get(apiRoutes.plugins)
      .then((r) => {
        if (r.status === 200) {
          setInstalledPlugins(r.data.plugins);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
        notifications.show({
          title: 'Failed to get installed plugins',
          message: apiErrorMessage(err, 'The request failed. Please try again.'),
          icon: <IconX />,
          color: 'red',
        });
      });
  }

  function getAvailablePlugins() {
    if (!pluginRepo || !pluginsEnabled || installedPlugins === null) return;
    setCatalogLoading(true);
    setCatalogError('');
    pluginRepository
      .get(pluginRepo)
      .then((r) => {
        if (
          !Array.isArray(r.data?.result?.projects) ||
          !r.data.result.projects.every((project: unknown) => typeof project === 'string')
        ) {
          throw new Error('Invalid plugin catalog');
        }
        setAvailablePlugins([...new Set<string>(r.data.result.projects)]);
        setCatalogLoaded(true);
      })
      .catch((err) => {
        setCatalogError(
          apiErrorMessage(
            err,
            'The optional plugin catalog is unavailable. Installed plugins are still listed below. Check repository connectivity and browser CORS access, then retry.'
          )
        );
      })
      .finally(() => setCatalogLoading(false));
  }

  const installedNames = new Set(
    (installedPlugins ?? []).map((item) => normalizedPluginName(item.distro))
  );
  const plugins: TableData = {
    head: ['Name', 'Show Info', 'Install', 'Delete'],
    body: [
      ...(installedPlugins ?? []).map((item) => [
        item.name,
        <Button
          key={`${item.distro}-info`}
          aria-label={`Show info for ${item.name}`}
          onClick={() => {
            setShowInfo(true);
            getInstalledPluginInfo(item.distro);
          }}
        >
          <IconInfoCircle />
        </Button>,
        <Button key={`${item.distro}-install`} disabled>
          <IconDownload />
        </Button>,
        <Button
          key={`${item.distro}-delete`}
          color="red"
          disabled={!pluginsEnabled}
          onClick={() => {
            setShowCommandOutput(true);
            setPlugin({ plugin_name: item.name, action: 'delete', plugin_distro: item.distro });
            setCommandOutputTitle(`Deleting ${item.name}`);
          }}
        >
          <IconCircleMinus />
        </Button>,
      ]),
      ...availablePlugins
        .filter((name) => !installedNames.has(normalizedPluginName(name)))
        .map((name) => {
          const distro = name.replace(/-/g, '_');
          return [
            name,
            <Button
              key={`${name}-info`}
              aria-label={`Show info for ${name}`}
              onClick={() => {
                setShowInfo(true);
                getAvailablePluginInfo(name);
              }}
            >
              <IconInfoCircle />
            </Button>,
            <Button
              key={`${name}-install`}
              aria-label={`Install ${name}`}
              disabled={!pluginsEnabled}
              onClick={() => {
                setShowCommandOutput(true);
                setPlugin({ plugin_distro: distro, action: 'install', plugin_name: name });
                setCommandOutputTitle(`Installing ${name}`);
              }}
            >
              <IconDownload />
            </Button>,
            <Button key={`${name}-delete`} disabled>
              <IconCircleMinus />
            </Button>,
          ];
        }),
    ],
  };

  // Scrolls the CodeMirror shell output to the bottom automatically
  const scrollBottom = ViewPlugin.fromClass(
    class {
      update(update: any) {
        if (update.docChanged) {
          update.view.scrollDOM.scrollTop = update.view.scrollDOM.scrollHeight;
        }
      }
    }
  );

  return (
    <>
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />

      <Text mb="sm">
        Server plugins are optional Python extensions that run on OpenTAKServer. They are separate
        from the APKs distributed to Android clients through Plugin Updates. Normal TAK connections
        do not require them. Browsing reads the catalog; installation requires the Install button.
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Configured repository: {pluginRepo ?? 'Loading…'}
      </Text>
      {!pluginsEnabled && (
        <Alert title="Server plugins are disabled" color="blue" mb="md">
          Enable OTS_ENABLE_PLUGINS in the server configuration and restart OpenTAKServer to manage
          extensions.
        </Alert>
      )}
      <Group mb="md">
        <Button
          disabled={!pluginsEnabled || !pluginRepo || installedPlugins === null}
          loading={catalogLoading}
          onClick={getAvailablePlugins}
        >
          {catalogError
            ? 'Retry Plugin Catalog'
            : catalogLoaded
              ? 'Refresh Plugin Catalog'
              : 'Browse Available Plugins'}
        </Button>
        <Button disabled={!pluginsEnabled} onClick={() => setShowUploadModal(true)}>
          Upload Plugin
        </Button>
      </Group>
      {catalogError && (
        <Alert title="Plugin catalog unavailable" color="yellow" mb="md">
          {catalogError}
        </Alert>
      )}
      {catalogLoaded && !catalogError && availablePlugins.length === 0 && (
        <Text mb="md">No plugins are available in the configured repository.</Text>
      )}
      <Modal
        title="Upload Plugin"
        w="50vw"
        size="xl"
        opened={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        closeOnEscape={!installingPlugin}
        closeOnClickOutside={!installingPlugin}
        withCloseButton={!installingPlugin}
      >
        <FileInput
          mb="md"
          clearable={!installingPlugin}
          disabled={installingPlugin}
          label="Select your zip, whl, or tar.gz file"
          onChange={(file) => {
            setInstallingPlugin(true);
            setPlugin({
              ...plugin,
              plugin_file: file,
              action: 'install_local',
              plugin_file_name: file?.name,
            });
          }}
        />
        <CodeMirror
          basicSetup={{ lineNumbers: false }}
          extensions={[scrollBottom]}
          lang="shell"
          maxHeight="60vh"
          value={commandOutput}
          height="100%"
          theme={computedColorScheme}
          readOnly
        />
        <Center>
          <Button mt="md" disabled={installingPlugin} onClick={() => window.location.reload()}>
            Refresh Browser
          </Button>
        </Center>
      </Modal>

      <Table.ScrollContainer minWidth="100%">
        <Table
          data={plugins}
          stripedColor={computedColorScheme === 'light' ? 'gray.2' : 'dark.8'}
          highlightOnHoverColor={computedColorScheme === 'light' ? 'gray.4' : 'dark.6'}
          striped="odd"
          highlightOnHover
          withTableBorder
          mb="md"
        />
      </Table.ScrollContainer>
      <Modal opened={showInfo} onClose={() => setShowInfo(false)} fullScreen>
        <ScrollArea style={{ width: '100%' }}>
          <Text size="md">
            <Text span inherit fw={700}>
              Name:
            </Text>{' '}
            {about?.name}
          </Text>
          <Text size="md">
            <Text span inherit fw={700}>
              Author:
            </Text>{' '}
            {about?.author}
          </Text>
          <Text size="md">
            <Text span inherit fw={700}>
              Author Email:
            </Text>{' '}
            {about?.author_email}
          </Text>
          <Text size="md">
            <Text span inherit fw={700}>
              License:
            </Text>{' '}
            {about?.license}
          </Text>
          <Text size="md">
            <Text span inherit fw={700}>
              Version:
            </Text>{' '}
            {about?.version}
          </Text>
          <Text size="md">
            <Text span inherit fw={700}>
              Documentation:
            </Text>{' '}
            <Link to={docUrl}>{docUrl}</Link>
          </Text>
          <Text size="md">
            <Text span inherit fw={700}>
              Repository:
            </Text>{' '}
            <Link to={repoUrl}>{repoUrl}</Link>
          </Text>
          <Divider mt="md" />
          <Markdown>{about?.description}</Markdown>
        </ScrollArea>
      </Modal>

      <Modal
        withCloseButton={showModelClose}
        title={commandOutputTitle}
        closeOnClickOutside={false}
        closeOnEscape={false}
        w="50vw"
        size="xl"
        opened={showCommandOutput}
        onClose={() => {
          setShowCommandOutput(false);
          setCommandOutput('');
        }}
      >
        <CodeMirror
          extensions={[scrollBottom]}
          lang="shell"
          maxHeight="60vh"
          value={commandOutput}
          height="100%"
          theme={computedColorScheme}
          readOnly
        />
        <Text mt="md" ta="center" fw={700} display={refreshButtonDisabled ? 'none' : 'block'}>
          Please restart OpenTAKServer and refresh your browser.
        </Text>
        <Center>
          <Button mt="md" disabled={refreshButtonDisabled} onClick={() => window.location.reload()}>
            Refresh Browser
          </Button>
        </Center>
      </Modal>
    </>
  );
}
