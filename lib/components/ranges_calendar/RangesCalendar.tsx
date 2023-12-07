import { ReactNode } from "react";

import {
	useRangesCalendar,
	useRangesCalendarReturnType,
	useRangesCalendarType,
} from "./useRangesCalendar";

type RangesCalendarType = useRangesCalendarType & {
	children?: (args: useRangesCalendarReturnType) => ReactNode;
	className?: string;
};

export const RangesCalendar = (
	propList: RangesCalendarType
) => {
	const { children, className } = propList;
	const calendar = useRangesCalendar(propList);
	return (
		<div
			aria-describedby="ranges_calendar"
			className={className}
		>
			{children?.({
				...calendar,
			})}
		</div>
	);
};
