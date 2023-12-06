import { useState } from "react";
import { CalendarDemo } from "./demo/CalendarDemo";
import { ClocksDemo } from "./demo/ClocksDemo";

function App() {
	const [date, setDate] = useState(new Date());

	return (
		<>
			<p className="font-mono font-bold p-2">
				{date.toString()}
			</p>
			<p className="px-2 font-mono text-2xl font-bold text-sky-400 py-2 mb-2">
				{date.toLocaleString("en-US", {
					month: "long",
				})}
			</p>
			<div className="flex gap-4 border">
				<CalendarDemo date={date} setDate={setDate} />
				<ClocksDemo date={date} setDate={setDate} />
			</div>
		</>
	);
}

export default App;
