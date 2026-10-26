import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
const meta = {
  title: 'Interface/Button',
  component: Button,
  args: { children: 'Registrar entrada' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Pending: Story = { args: { busy: true } };
