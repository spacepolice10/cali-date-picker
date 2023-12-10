import { useArgs } from "@storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react";
import { Calendar } from "../../../lib/main";
import "../../index.css";

const meta: Meta<typeof Calendar> = {
  title: "Examples/Calendar",
  component: Calendar,
};
export default meta;
type Story = StoryObj<typeof Calendar>;

export const Base: Story = {
  args: {
    date: new Date(),
    onChange: () => {},
    className: "border p-4 grid grid-cols-4 gap-8",
    locale: "en-US",
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <div>
        <p className="font-mono py-2">
          {args.date.toLocaleString(args?.locale, {
            dateStyle: "long",
          })}
        </p>
        <Calendar
          {...args}
          date={args.date as Date}
          onChange={(date: Date) => {
            updateArgs({
              date,
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
                      isActive,
                      dateSelectPropList,
                      isSelected,
                    }) => (
                      <button
                        {...dateSelectPropList}
                        key={dateSelectPropList?.key}
                        style={{
                          borderColor: isSelected ? "hotpink" : "",
                          backgroundColor: isActive ? "black" : "",
                          color: isActive ? "white" : "",
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
        </Calendar>
      </div>
    );
  },
};
export const MonthsPicker: Story = {
  args: {
    date: new Date(),
    onChange: () => {},
  },
  render: function Render(args) {
    const date = args?.date;
    const [, updateArgs] = useArgs();

    return (
      <>
        <h2 className="font-bold px-2">
          {date?.toLocaleString("en-US", {
            month: "long",
          })}
        </h2>
        <Calendar
          date={date}
          onChange={(date) => {
            updateArgs({ date });
          }}
        >
          {({ months, selectPrev, selectNext }) => (
            <div>
              <div className="flex gap-4 px-2 pt-4 pb-2 border-b">
                <button
                  onClick={selectPrev}
                  className="font-mono rounded-md p-2 bg-gray-100 text-xs hover:underline"
                >
                  pick previous
                </button>
                <button
                  onClick={selectNext}
                  className="font-mono rounded-md p-2 bg-gray-100 text-xs hover:underline"
                >
                  pick next
                </button>
              </div>
              <div className="grid w-80 gap-2 px-2 grid-cols-7">
                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d) => (
                  <p className="h-10 w-10 font-mono text-gray-400 flex justify-center items-center p-2">
                    {d}
                  </p>
                ))}
              </div>
              {months.map((m) => {
                return (
                  <>
                    <div className="px-2 grid w-80 grid-cols-7 gap-2">
                      {m.days.map((d) => (
                        <button
                          {...d.dateSelectPropList}
                          key={d.dateSelectPropList?.key}
                          className={`h-10 w-10 font-mono font-bold p-2 rounded-sm  
                                                ${d.isActive && "bg-pink-200"}
                                                ${d.isSelected && "bg-sky-200"}
                                                `}
                        >
                          {d.daysNumber}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })}
            </div>
          )}
        </Calendar>
      </>
    );
  },
};
