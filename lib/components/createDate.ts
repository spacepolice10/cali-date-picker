export type createDateType = {
	date?: Date;
	locale?: string;
	timezone?: string;
	calendar?: string;
};

export type createDateReturnType = {
	activeDateWithTime: Date;
	activeDate: string;
	daysName: string;
	monthsName: string;
	yearNumber: number;
	monthsNumber: number;
	hourNumber: number;
	minuteNumber: number;
	secondNumber: number;
	msNumber: number;
	daysNumberInAWeek: number;
	daysNumberInAMonth: number;
	amountOfDaysInAMonth: number;
	firstMonthDate: number;
};

export const createDate = (
	propList?: createDateType
): createDateReturnType => {
	const date = propList?.date ?? new Date();
	const [monthsName, daysName] = date
		.toLocaleString(propList?.locale ?? "en-US", {
			weekday: "long",
			month: "long",
			timeZone:
				Intl.DateTimeFormat().resolvedOptions().timeZone,
			calendar:
				Intl.DateTimeFormat().resolvedOptions().calendar,
		})
		.split(" ");

	return {
		activeDateWithTime: new Date(),
		activeDate: new Date().toLocaleDateString(),
		daysName,
		monthsName,
		yearNumber: date.getFullYear(),
		monthsNumber: date.getMonth() + 1,
		hourNumber: date.getHours(),
		minuteNumber: date.getMinutes(),
		secondNumber: date.getSeconds(),
		msNumber: date.getMilliseconds(),
		daysNumberInAWeek: date.getDay(),
		daysNumberInAMonth: date.getDate(),
		amountOfDaysInAMonth:
			new Date(
				date.getFullYear(),
				date.getMonth(),
				0
			).getDate() + 1,
		firstMonthDate: new Date(
			date.getFullYear(),
			date.getMonth(),
			1
		).getDay(),
	};
};
