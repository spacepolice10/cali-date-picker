import { createDate } from "../createDate";

export type useDateformType = {
	date: Date;
	onChange: (date: Date) => void;
	locale?: string;
	timezone?: string;
};

export type useDateformReturnType = {
	daysFormPropList: dateformType;
	monthsFormPropList: dateformType;
	yearFormPropList: dateformType;
};

export type dateformType = {
	onChange: (ev: React.FormEvent) => void;
	defaultValue?: string;
	type?: "number";
	maxLength: number;
};

export const useDateform = (
	propList?: useDateformType
): useDateformReturnType => {
	const date = createDate({
		date:
			typeof propList?.date == "string"
				? new Date(propList?.date)
				: propList?.date,
		locale: propList?.locale,
	});

	function changeDate(args: {
		daysNumber?: number;
		monthsNumber?: number;
		yearNumber?: number;
	}) {
		const dt = Object.assign(date, {
			daysNumber: args.daysNumber ?? date.daysNumber,
			monthsNumber:
				args.monthsNumber ?? date.monthsNumber - 1,
			yearNumber: args.yearNumber ?? date.yearNumber,
		});
		const updateDate = new Date(
			dt.yearNumber,
			dt.monthsNumber,
			dt.daysNumber,
			dt.hourNumber,
			dt.minuteNumber,
			dt.secondNumber
		);
		propList?.onChange(updateDate);
	}
	function updateYear(ev: React.FormEvent) {
		const target = ev.target as HTMLInputElement;
		const year = target.value;
		const maxVal = 9999;
		if (+year > maxVal) {
			changeDate({
				yearNumber: maxVal,
			});
		} else {
			changeDate({
				yearNumber: +year,
			});
		}
	}
	function updateDays(ev: React.FormEvent) {
		const target = ev.target as HTMLInputElement;
		const days = target.value;
		const maxVal = date.amountOfDaysInAMonth;
		if (+days <= 0) return;
		if (+days > maxVal) {
			changeDate({ daysNumber: maxVal });
		} else {
			changeDate({ daysNumber: +days });
		}
	}
	function updateMonths(ev: React.FormEvent) {
		const target = ev.target as HTMLInputElement;
		const months = target.value;
		const maxVal = 12;
		if (+months > maxVal) {
			changeDate({ monthsNumber: maxVal });
		} else {
			changeDate({ monthsNumber: +months - 1 });
		}
	}

	const yearFormPropList = {
		onChange: updateYear,
		defaultValue: `${date.yearNumber}`,
		maxLength: 4,
	};
	const daysFormPropList = {
		onChange: updateDays,
		defaultValue: `${date.daysNumber}`,
		maxLength: 2,
	};
	const monthsFormPropList = {
		onChange: updateMonths,
		defaultValue: `${date.monthsNumber}`,
		maxLength: 2,
	};

	return {
		yearFormPropList,
		daysFormPropList,
		monthsFormPropList,
	};
};
