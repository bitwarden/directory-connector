import { Meta, moduleMetadata, Story } from "@storybook/angular";

import { I18nService } from "jslib-common/abstractions/i18n.service";

import { I18nMockService } from "../utils/i18n-mock.service";

import { CalloutComponent } from "./callout.component";

export default {
  title: "Jslib/Callout",
  component: CalloutComponent,
  decorators: [
    moduleMetadata({
      providers: [
        {
          provide: I18nService,
          useFactory: () => {
            return new I18nMockService({
              warning: "Warning",
              error: "Error",
            });
          },
        },
      ],
    }),
  ],
  args: {
    type: "warning",
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/f32LSg3jaegICkMu7rPARm/Tailwind-Component-Library-Update?node-id=1881%3A17484",
    },
  },
} as Meta;

const Template: Story<CalloutComponent> = (args: CalloutComponent) => ({
  props: args,
  template: `
    <bit-callout [type]="type" [title]="title">Content</bit-callout>
  `,
});

export const Success = Template.bind({});
Success.args = {
  type: "success",
  title: "Success",
};

export const Info = Template.bind({});
Info.args = {
  type: "info",
  title: "Info",
};

export const Warning = Template.bind({});
Warning.args = {
  type: "warning",
};

export const Danger = Template.bind({});
Danger.args = {
  type: "danger",
};
