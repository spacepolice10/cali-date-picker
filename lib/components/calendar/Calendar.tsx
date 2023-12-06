import { ReactNode } from "react";
import {
	useCalendar,
	useCalendarReturnType,
	useCalendarType,
} from "./useCalendar";

type CalendarType = useCalendarType & {
	children?: (args: useCalendarReturnType) => ReactNode;
	className?: string;
};

export const Calendar = (propList: CalendarType) => {
	const { children, className } = propList;
	const calendar = useCalendar(propList);
	return (
		<div aria-describedby="calendar" className={className}>
			{children?.({
				...calendar,
			})}
		</div>
	);
};
