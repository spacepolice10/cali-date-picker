import { useArgs } from "@storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react";
import { Clocks } from "../../../lib/main";
import "../../index.css";

const meta: Meta<typeof Clocks> = {
  title: "Examples/Clocks",
  component: Clocks,
};
export default meta;
type Story = StoryObj<typeof Clocks>;
export const Base: Story = {
  args: {
    date: new Date(),
    className: "border p-6",
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    const BlocksStyles =
      "flex w-10 items-center border-r border-gray-100 flex-col gap-2 h-40 overflow-y-scroll";
    const ButtonStyles = "h-8 w-8 font-mono border-b border-transparent p-[2px]";
    return (
      <div>
        <p className="font-mono py-2">
          {args.date.toLocaleString(args?.locale, {
            timeStyle: "long",
          })}
        </p>
        <Clocks
          {...args}
          onChange={(date: Date) => {
            updateArgs({ date });
          }}
        >
          {({ hourList, minuteList, secondList }) => (
            <div className="flex gap-2">
              <div className={BlocksStyles}>
                {hourList.map(({ number, timeSelectPropList, isSelected }) => (
                  <button
                    {...timeSelectPropList}
                    style={{
                      borderColor: isSelected ? "hotpink" : "",
                    }}
                    className={ButtonStyles}
                  >
                    {number}
                  </button>
                ))}
              </div>
              <div className={BlocksStyles}>
                {minuteList.map(({ number, timeSelectPropList, isSelected }) => (
                  <button
                    {...timeSelectPropList}
                    style={{
                      borderColor: isSelected ? "hotpink" : "",
                    }}
                    className={ButtonStyles}
                  >
                    {number}
                  </button>
                ))}
              </div>
              <div className={BlocksStyles}>
                {secondList.map(({ number, timeSelectPropList, isSelected }) => (
                  <button
                    {...timeSelectPropList}
                    style={{
                      borderColor: isSelected ? "hotpink" : "",
                    }}
                    className={ButtonStyles}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Clocks>
      </div>
    );
  },
};
