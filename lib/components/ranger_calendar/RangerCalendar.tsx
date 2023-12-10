import { ReactNode } from "react";
import {
  useRangerCalendar,
  useRangerCalendarReturnType,
  useRangerCalendarType,
} from ".";

type RangerCalendarType = useRangerCalendarType & {
  children?: (args: useRangerCalendarReturnType) => ReactNode;
  className?: string;
};

export const RangerCalendar = (propList: RangerCalendarType) => {
  const { children, className } = propList;
  const calendar = useRangerCalendar(propList);
  return (
    <div aria-describedby="ranger_calendar" className={className}>
      {children?.({
        ...calendar,
      })}
    </div>
  );
};
