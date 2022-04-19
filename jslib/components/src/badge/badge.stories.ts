import { Meta, Story } from "@storybook/angular";

import { BadgeComponent } from "./badge.component";

export default {
  title: "Jslib/Badge",
  component: BadgeComponent,
  args: {
    type: "primary",
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/f32LSg3jaegICkMu7rPARm/Tailwind-Component-Library-Update?node-id=1881%3A16956",
    },
  },
} as Meta;

const Template: Story<BadgeComponent> = (args: BadgeComponent) => ({
  props: args,
  template: `
    <span class="tw-text-main">Span </span><span bit-badge [badgeType]="type">Badge</span>
    <br><br>
    <span class="tw-text-main">Link </span><a href="#" bit-badge [badgeType]="type">Badge</a>
    <br><br>
    <span class="tw-text-main">Button </span><button bit-badge [badgeType]="type">Badge</button>
  `,
});

export const Primary = Template.bind({});
Primary.args = {};

export const Secondary = Template.bind({});
Secondary.args = {
  type: "secondary",
};

export const Success = Template.bind({});
Success.args = {
  type: "success",
};

export const Danger = Template.bind({});
Danger.args = {
  type: "danger",
};

export const Warning = Template.bind({});
Warning.args = {
  type: "warning",
};

export const Info = Template.bind({});
Info.args = {
  type: "info",
};
