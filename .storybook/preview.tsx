import type { Preview } from '@storybook/react';
import { MaterialTheme } from '../src/components/MaterialTheme';
import '../src/styles/global.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <MaterialTheme>
        <Story />
      </MaterialTheme>
    ),
  ],
};

export default preview;
