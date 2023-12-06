import { ReactNode } from "react";
import {
	useClocks,
	useClocksReturnType,
	useClocksType,
} from "./useClocks";

type ClocksType = useClocksType & {
	children?: (args: useClocksReturnType) => ReactNode;
	className?: string;
};

export const Clocks = (propList: ClocksType) => {
	const { children, className } = propList;
	const clocks = useClocks(propList);
	return (
		<div
			aria-describedby="clocks-picker"
			className={className}
		>
			{children?.({ ...clocks })}
		</div>
	);
};
