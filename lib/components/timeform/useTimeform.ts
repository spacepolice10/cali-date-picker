import { createDate } from "../createDate";

export type useTimeformType = {
	date: Date;
	onChange: (date: Date) => void;
	locale?: string;
	timezeon?: string;
};

export type useTimeformReturnType = {
	hourFormPropList: timeformType;
	minuteFormPropList: timeformType;
	secondFormPropList: timeformType;
};

export type timeformType = {
	onChange: (ev: React.FormEvent) => void;
	defaultValue?: string;
	type?: "number";
	maxLength: number;
};

export const useTimeform = (propList: useTimeformType) => {
	const date = createDate({
		date:
			typeof propList?.date == "string"
				? new Date(propList?.date)
				: propList?.date,
		locale: propList?.locale,
	});

	function changeTime(args: {
		hourNumber?: number;
		minuteNumber?: number;
		secondNumber?: number;
	}) {
		const updateDate = new Date(
			date.yearNumber,
			date.monthsNumber - 1,
			date.daysNumber,
			args.hourNumber ? args.hourNumber + 1 : date.hourNumber,
			args.minuteNumber ?? date.minuteNumber,
			args.secondNumber ?? date.secondNumber
		);
		propList?.onChange(updateDate);
	}
	function updateHour(ev: React.FormEvent) {
		const target = ev.target as HTMLInputElement;
		const hour = target.value;
		const maxVal = 24;
		if (+hour <= 0) return;
		if (+hour > maxVal) {
			changeTime({ hourNumber: maxVal });
		} else {
			changeTime({ hourNumber: +hour });
		}
	}
	function updateMinute(ev: React.FormEvent) {
		const target = ev.target as HTMLInputElement;
		const minute = target.value;
		const maxVal = 60;
		if (+minute <= 0) return;
		if (+minute > maxVal) {
			changeTime({ minuteNumber: maxVal });
		} else {
			changeTime({ minuteNumber: +minute });
		}
	}
	function updateSecond(ev: React.FormEvent) {
		const target = ev.target as HTMLInputElement;
		const second = target.value;
		const maxVal = 60;
		if (+second <= 0) return;
		if (+second > maxVal) {
			changeTime({ secondNumber: maxVal });
		} else {
			changeTime({ secondNumber: +second });
		}
	}
	const hourFormPropList = {
		onChange: updateHour,
		defaultValue: `${date.hourNumber}`,
		maxLength: 4,
	};
	const minuteFormPropList = {
		onChange: updateMinute,
		defaultValue: `${date.minuteNumber}`,
		maxLength: 2,
	};
	const secondFormPropList = {
		onChange: updateSecond,
		defaultValue: `${date.secondNumber}`,
		maxLength: 2,
	};
	return {
		hourFormPropList,
		minuteFormPropList,
		secondFormPropList,
	};
};
