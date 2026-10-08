import axios, { apiErrorMessage } from '@/axios_config.tsx';
import { apiRoutes } from '@/apiRoutes.tsx';
import { Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLanguageHiragana, IconX, IconCheck } from '@tabler/icons-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageInfo {
  name: string;
  language_code: string;
}

export default function LanguageSelector(): React.ReactElement {
  const [languages, setLanguages] = useState<Map<string, LanguageInfo>>();
  const [languageOptions, setLanguageOptions] = useState<Array<{ value: string; label: string }>>(
    []
  );
  const [selectedCountry, setSelectedCountry] = useState(
    localStorage.getItem('country') === null ? 'US' : localStorage.getItem('country')!
  );
  const { t, i18n } = useTranslation();

  useEffect(() => {
    get_languages();
  }, []);

  useEffect(() => {
    set_language(selectedCountry);
  }, [selectedCountry]);

  function set_language(selectedCountry: string) {
    if (languages === undefined || languages.get(selectedCountry) === undefined) {
      return;
    }

    const language = languages.get(selectedCountry);

    axios
      .put(apiRoutes.language + '/' + language?.language_code)
      .then((r) => {
        if (r.status === 200) {
          if (language !== undefined) {
            void i18n.changeLanguage(language.language_code);
            localStorage.setItem('country', selectedCountry);

            notifications.show({
              title: t('Success'),
              message: t(`Language changed to ${language.name}`),
              color: 'green',
              icon: <IconCheck />,
            });
          }
        }
      })
      .catch((err) => {
        console.log(err);
        notifications.show({
          title: t('Failed to set language'),
          message: apiErrorMessage(err, t('The request failed. Please try again.')),
          color: 'red',
          icon: <IconX />,
        });
      });
  }

  function get_languages() {
    axios
      .get(apiRoutes.language)
      .then((r) => {
        if (r.status === 200) {
          const supported_languages = new Map();
          const options: Array<{ value: string; label: string }> = [];

          for (const countryCode in r.data) {
            const language: LanguageInfo = r.data[countryCode];
            supported_languages.set(countryCode, language);
            options.push({ value: countryCode, label: language.name });
          }

          setLanguages(supported_languages);
          setLanguageOptions(options);
        }
      })
      .catch((err) => {
        console.log(err);
        notifications.show({
          title: t('Failed to get supported languages'),
          message: apiErrorMessage(err, t('The request failed. Please try again.')),
          color: 'red',
          icon: <IconX />,
        });
      });
  }

  return (
    <Select
      aria-label={t('Language')}
      data={languageOptions}
      value={selectedCountry}
      onChange={(country) => {
        if (country) setSelectedCountry(country);
      }}
      allowDeselect={false}
      searchable
      leftSection={<IconLanguageHiragana size={18} />}
      placeholder={t('Language')}
    />
  );
}
