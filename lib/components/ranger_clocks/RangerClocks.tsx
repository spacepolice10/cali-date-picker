import { ReactNode } from "react";
import {
  useRangerClocks,
  useRangerClocksReturnType,
  useRangerClocksType,
} from "./useRangerClocks";

type RangerClocksType = useRangerClocksType & {
  children?: (args: useRangerClocksReturnType) => ReactNode;
  className?: string;
};

export const RangerClocks = (propList: RangerClocksType) => {
  const { children, className } = propList;
  const calendar = useRangerClocks(propList);
  return (
    <div aria-describedby="ranger_calendar" className={className}>
      {children?.({
        ...calendar,
      })}
    </div>
  );
};
