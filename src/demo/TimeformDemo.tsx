import { Dispatch, SetStateAction } from "react";
import { Timeform } from "../../lib/components/timeform/Timeform";

export const TimeformDemo = ({
	date,
	setDate,
}: {
	date: Date;
	setDate: Dispatch<SetStateAction<Date>>;
}) => {
	const dateFormStyles = "w-20 px-2 outline-none";
	return (
		<>
			<Timeform date={date} onChange={setDate}>
				{({
					hourFormPropList,
					minuteFormPropList,
					secondFormPropList,
				}) => (
					<div>
						<input
							{...hourFormPropList}
							className={dateFormStyles}
						/>
						{"/"}
						<input
							{...minuteFormPropList}
							className={dateFormStyles}
						/>
						{"/"}
						<input
							{...secondFormPropList}
							className={dateFormStyles}
						/>
					</div>
				)}
			</Timeform>
		</>
	);
};
