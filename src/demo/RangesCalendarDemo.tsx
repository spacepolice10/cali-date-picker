import { useState } from "react";
import { RangesCalendar } from "../../lib/main";

export const RangesCalendarDemo = ({
	date,
}: {
	date: Date;
}) => {
	const [ranges, setRanges] = useState<{
		RangesBeginsWith: string;
		RangesEndsWith: string;
	} | null>(null);
	console.log(ranges);
	return (
		<>
			<div className="flex gap-4 font-mono bg-gray-100 p-2 rounded-md w-fit mt-2 mx-2">
				<p>{ranges?.RangesBeginsWith}</p>
				<p>{ranges?.RangesEndsWith}</p>
			</div>
			<RangesCalendar date={date} onChange={setRanges}>
				{({ months, selectPrev, selectNext }) => (
					<div>
						<div className="flex gap-4 px-2 pt-4 pb-2 border-b">
							<button
								onClick={selectPrev}
								className="font-mono text-xs hover:underline"
							>
								prev
							</button>
							<button
								onClick={selectNext}
								className="font-mono text-xs hover:underline"
							>
								next
							</button>
						</div>
						<div className="grid w-80 gap-2 px-2 grid-cols-7">
							{["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map(
								(d) => (
									<p className="h-10 w-10 font-mono text-gray-400 flex justify-center items-center p-2">
										{d}
									</p>
								)
							)}
						</div>
						{months.map((m) => {
							return (
								<>
									<div className="px-2 grid w-80 grid-cols-7 gap-2">
										{m.days.map((d) => (
											<button
												{...d.RangesDatePropList}
												key={d.daysNumber}
												className={`h-10 w-10 font-mono font-bold duration-75 p-2 rounded-sm ${
													d.isInRangesBeforeSelect &&
													"bg-gray-200"
												} ${d.isInRanges && "bg-gray-200"} ${
													d.isActive && "bg-pink-200"
												} ${
													d.isSelected &&
													"bg-sky-200 shadow-lg"
												}
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
			</RangesCalendar>
		</>
	);
};
