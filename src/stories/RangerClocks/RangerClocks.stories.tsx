import { useArgs } from "@storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react";
import { RangerClocks } from "../../../lib/main";
import "../../index.css";

const meta: Meta<typeof RangerClocks> = {
  title: "Examples/RangerClocks",
  component: RangerClocks,
};
export default meta;
type Story = StoryObj<typeof RangerClocks>;

export const Base: Story = {
  args: {
    startsWithDate: undefined,
    endsWithDate: undefined,
    startsFromDate: new Date(),
    className: "border p-4 w-full grid grid-cols-4 gap-52",
    locale: "ru-RU",
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <div>
        <div className="flex gap-4 h-16">
          <p className="font-mono py-2 h-16">
            {args.startsWithDate && args.startsWithDate?.toLocaleTimeString()}
          </p>
          <p className="font-mono py-2 h-16">
            {args.endsWithDate?.toLocaleTimeString()}
          </p>
        </div>
        <RangerClocks
          {...args}
          startsWithDate={args.startsWithDate as Date}
          endsWithDate={args.endsWithDate as Date}
          onStartsWithDateChange={(date: Date | string | null) => {
            updateArgs({
              startsWithDate: date,
            });
          }}
          onEndsWithDateChange={(date: Date | string | null) => {
            updateArgs({
              endsWithDate: date,
            });
          }}
        >
          {({ time, combinedData }) => (
            <>
              <p>{combinedData}</p>
              <div className="h-80 w-96 flex flex-col overflow-y-scroll">
                {time.map(
                  (list) =>
                    list?.map(
                      ({
                        timeSelectPropList,
                        isInRanges,

                        isInRangesBeforeSelect,
                        minute,
                      }) => (
                        <button
                          {...timeSelectPropList}
                          style={{
                            fontWeight:
                              isInRanges || isInRangesBeforeSelect ? "bold" : "",
                            transitionDuration: "150ms",
                          }}
                          className="flex items-center gap-2 w-full"
                        >
                          <div className="w-40">{minute}</div>
                          <div
                            style={{
                              backgroundColor:
                                isInRanges || isInRangesBeforeSelect
                                  ? "hotpink"
                                  : "",
                            }}
                            className="w-full h-px bg-black"
                          ></div>
                        </button>
                      )
                    )
                )}
              </div>
            </>
          )}
        </RangerClocks>
      </div>
    );
  },
};
