import { Meta, Story } from "@storybook/angular";

import { ButtonComponent } from "./button.component";

export default {
  title: "Jslib/Button",
  component: ButtonComponent,
  args: {
    buttonType: "primary",
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/f32LSg3jaegICkMu7rPARm/Tailwind-Component-Library-Update?node-id=1881%3A16733",
    },
  },
} as Meta;

const Template: Story<ButtonComponent> = (args: ButtonComponent) => ({
  props: args,
  template: `
    <button bit-button [buttonType]="buttonType" [block]="block">Button</button>
    <a bit-button [buttonType]="buttonType" [block]="block" href="#" class="tw-ml-2">Link</a>
  `,
});

export const Primary = Template.bind({});
Primary.args = {
  buttonType: "primary",
};

export const Secondary = Template.bind({});
Secondary.args = {
  buttonType: "secondary",
};

export const Danger = Template.bind({});
Danger.args = {
  buttonType: "danger",
};

const DisabledTemplate: Story = (args) => ({
  props: args,
  template: `
    <button bit-button disabled buttonType="primary" class="tw-mr-2">Primary</button>
    <button bit-button disabled buttonType="secondary" class="tw-mr-2">Secondary</button>
    <button bit-button disabled buttonType="danger" class="tw-mr-2">Danger</button>
  `,
});

export const Disabled = DisabledTemplate.bind({});
Disabled.args = {
  size: "small",
};
