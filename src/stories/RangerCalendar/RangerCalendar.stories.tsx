import { useArgs } from "@storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react";
import { RangerCalendar } from "../../../lib/main";
import "../../index.css";

const meta: Meta<typeof RangerCalendar> = {
  title: "Examples/RangerCalendar",
  component: RangerCalendar,
};
export default meta;
type Story = StoryObj<typeof RangerCalendar>;

export const Base: Story = {
  args: {
    startsWithDate: undefined,
    endsWithDate: undefined,
    monthsNumberToDraw: 2,
    className: "border p-4 w-full grid grid-cols-4 gap-52",
    locale: "en-US",
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <div>
        <div className="flex gap-4 h-16">
          <p className="font-mono py-2 h-16">
            {args.startsWithDate &&
              args.startsWithDate?.toLocaleString(args?.locale, {
                dateStyle: "long",
              })}
          </p>
          <p className="font-mono py-2 h-16">
            {args.endsWithDate?.toLocaleString(args?.locale, {
              dateStyle: "long",
            })}
          </p>
        </div>
        <RangerCalendar
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
          {({ months }) => (
            <>
              {months.map(({ days }) => (
                <div className="grid grid-cols-7 w-52 p-2">
                  {days.map(
                    ({
                      daysNumber,
                      isInRanges,
                      dateSelectPropList,
                      isActive,
                      isInRangesBeforeSelect,
                    }) => (
                      <button
                        {...dateSelectPropList}
                        key={dateSelectPropList?.key + window.crypto.randomUUID()}
                        style={{
                          borderColor: isActive ? "hotpink" : "",
                          backgroundColor: isInRanges ? "orange" : "",
                          color: isInRangesBeforeSelect ? "hotpink" : "",
                        }}
                        className="flex items-center p-[2px] border-b border-transparent justify-center"
                      >
                        {daysNumber}
                      </button>
                    )
                  )}
                </div>
              ))}
            </>
          )}
        </RangerCalendar>
      </div>
    );
  },
};
