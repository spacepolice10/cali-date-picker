import { useArgs } from "@storybook/preview-api";
import { Meta, StoryObj } from "@storybook/react";
import { Timeform } from "../../../lib/main";
import "../../index.css";

const meta: Meta<typeof Timeform> = {
  title: "Examples/Timeform",
  component: Timeform,
};
export default meta;
type Story = StoryObj<typeof Timeform>;
export const Base: Story = {
  args: {
    date: new Date(),
    className: "border p-6",
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    const dateFormStyles = "w-10 text-center px-[2px] font-mono outline-none";
    return (
      <div>
        <p className="font-mono py-2">
          {args.date.toLocaleString(args?.locale, {
            timeStyle: "long",
          })}
        </p>
        <Timeform {...args} onChange={(date: Date) => updateArgs(date)}>
          {({ hourFormPropList, minuteFormPropList, secondFormPropList }) => (
            <div className="flex">
              <input {...hourFormPropList} className={dateFormStyles} />
              <p className="text-gray-200">{"/"}</p>
              <input {...minuteFormPropList} className={dateFormStyles} />
              <p className="text-gray-200">{"/"}</p>
              <input {...secondFormPropList} className={dateFormStyles} />
            </div>
          )}
        </Timeform>
      </div>
    );
  },
};
