import GLib from "gi://GLib"
import { createPoll } from "ags/time"
import { createState } from "ags"

let prevIdle = 0, prevTotal = 0
function readCpu(): number {
	const [, b] = GLib.file_get_contents('/proc/stat')
	const nums = new TextDecoder().decode(b).split('\n')[0].split(/\s+/).slice(1).map(Number)
	const idle = nums[3] + nums[4]
	const total = nums.reduce((a, n) => a + n, 0)
	const pct = prevTotal > 0 ? Math.round((1 - (idle - prevIdle) / (total - prevTotal)) * 100) : 0
	prevIdle = idle; prevTotal = total
	return Math.max(0, Math.min(100, pct))
}

export default function Cpu() {
	const [val, setVal] = createState("0%")
	const _tick = createPoll("", 2000, () => { setVal(`${readCpu()}%`); return "" })

	return (
		<box class="cpu-container">
			<label visible={false} label={_tick} />
			<label class="sysinfo-icon" label="󰻠 " />
			<label class="sysinfo-value" label={val} />
		</box>
	)
}
