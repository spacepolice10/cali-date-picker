import { useArgs } from "@storybook/preview-api";
import { Meta, StoryObj } from "@storybook/react";
import { Dateform } from "../../../lib/main";
import "../../index.css";

const meta: Meta<typeof Dateform> = {
  title: "Examples/Dateform",
  component: Dateform,
};
export default meta;
type Story = StoryObj<typeof Dateform>;
export const Base: Story = {
  args: {
    date: new Date(),
    className: "border p-6",
    locale: "en-US",
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    const dateFormStyles = "w-16 text-center px-2 font-mono outline-none";
    return (
      <div>
        <p className="font-mono py-2">
          {args.date.toLocaleString(args?.locale, {
            dateStyle: "long",
          })}
        </p>
        <Dateform
          {...args}
          onChange={(date: Date) => {
            updateArgs({ date });
          }}
        >
          {({ yearFormPropList, monthsFormPropList, daysFormPropList }) => (
            <div className="flex">
              <input {...yearFormPropList} className={dateFormStyles} />
              <p className="text-gray-200">{"/"}</p>
              <input {...monthsFormPropList} className={dateFormStyles} />
              <p className="text-gray-200">{"/"}</p>
              <input {...daysFormPropList} className={dateFormStyles} />
            </div>
          )}
        </Dateform>
      </div>
    );
  },
};
