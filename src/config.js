export const STORAGE_KEY = 'orl.savedLinks';
export const STORAGE_KEY_LEGACY = 'savedLinks';
export const STORAGE_CORRUPT_KEY = 'orl.savedLinks.corrupt';
export const DARK_MODE_KEY = 'orl.darkMode';
export const DARK_MODE_KEY_LEGACY = 'darkMode';
export const LINK_AMOUNT_KEY = 'orl.linkAmount';
export const LINK_AMOUNT_KEY_LEGACY = 'linkAmount';
export const OPEN_GROUP_KEY = 'orl.openGroup';
export const OPEN_GROUP_KEY_LEGACY = 'openGroup';
export const OPEN_TAG_KEY = 'orl.openTag';
export const OPEN_TAG_KEY_LEGACY = 'openTag';

export const MAX_URL_LENGTH = 4096;
export const MAX_NAME_LENGTH = 200;
export const MAX_GROUP_NAME_LENGTH = 64;
export const MAX_LINKS = 5000;
export const MAX_GROUPS = 100;
export const MAX_SUBGROUPS_PER_GROUP = 100;
export const MAX_TAG_CATALOG = 1000;
export const MAX_IMPORT_BYTES = 3 * 1024 * 1024;

export const MIN_LINK_AMOUNT = 1;
export const MAX_LINK_AMOUNT = 10;

export const DEFAULT_GROUP = 'Main';
export const TAGS_GROUP = 'Tags';

export const TAG_MAX_LENGTH = 128;
export const TAG_PATTERN = /^[A-Za-z0-9]+$/;

export const TAG_PALETTE = [
  { light: '#1c51ba', dark: '#2e6be5' },
  { light: '#1c9bba', dark: '#2ec1e5' },
  { light: '#1cba7b', dark: '#2ee59c' },
  { light: '#701cba', dark: '#902ee5' },
  { light: '#ba1cb5', dark: '#e52edf' },
  { light: '#ba1c80', dark: '#e52ea2' },
];

export const THEME_COLOR_LIGHT = '#e4f6e9';
export const THEME_COLOR_DARK = '#1a2c22';
