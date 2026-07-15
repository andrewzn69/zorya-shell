import { createPoll } from "ags/time"
import { createState } from "ags"

interface SysInfoProps {
	class: string           // container class for the box
	initial: string         // value shown before the first poll
	poll: (intervalSec: number) => string   // produces the display string; receives the poll interval in seconds
	icon?: string           // optional glyph rendered before the value
	interval?: number       // poll interval in ms, default 2000
	valueWidth?: number     // fixed char width for the value, avoids width jitter
}

export default function SysInfo({ class: cls, initial, poll, icon, interval = 2000, valueWidth }: SysInfoProps) {
	const [val, setVal] = createState(initial)
	const _tick = createPoll("", interval, () => { setVal(poll(interval / 1000)); return "" })

	return (
		<box class={cls}>
			<label visible={false} label={_tick} />
			{icon ? [<label class="sysinfo-icon" label={icon} />] : []}
			<label class="sysinfo-value" label={val} widthChars={valueWidth ?? -1} maxWidthChars={valueWidth ?? -1} />
		</box>
	)
}
