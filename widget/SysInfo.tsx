import { createState } from "ags";
import { createPoll } from "ags/time";

interface SysInfoProps {
	class: string; // container class for the box
	initial: string; // value shown before the first poll
	poll: () => string; // produces the display string
	icon?: string; // optional glyph rendered before the value
	interval?: number; // poll interval in ms, default 2000
	valueWidth?: number; // fixed char width for the value, avoids width jitter
}

export function SysInfo({
	class: cls,
	initial,
	poll,
	icon,
	interval = 2000,
	valueWidth,
}: SysInfoProps) {
	const [val, setVal] = createState(initial);
	const _tick = createPoll("", interval, () => {
		setVal(poll());
		return "";
	});

	return (
		<box class={cls}>
			<label label={_tick} visible={false} />
			<label class="sysinfo-icon" label={icon ?? ""} visible={Boolean(icon)} />
			<label
				class="sysinfo-value"
				label={val}
				maxWidthChars={valueWidth ?? -1}
				widthChars={valueWidth ?? -1}
			/>
		</box>
	);
}
