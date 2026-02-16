import GLib from "gi://GLib"
import { createPoll } from "ags/time"
import { createState } from "ags"

function readRam(): number {
	const [, b] = GLib.file_get_contents('/proc/meminfo')
	const text = new TextDecoder().decode(b)
	const get = (k: string) => parseInt(text.match(new RegExp(k + ':\\s+(\\d+)'))?.[1] ?? '0')
	return (get('MemTotal') - get('MemAvailable')) / 1048576  // GB
}

export default function Ram() {
	const [val, setVal] = createState("0.0G")
	const _tick = createPoll("", 2000, () => { setVal(`${readRam().toFixed(1)}G`); return "" })

	return (
		<box class="ram-container">
			<label visible={false} label={_tick} />
			<label class="sysinfo-icon" label={" \u2006"} />
			<label class="sysinfo-value" label={val} />
		</box>
	)
}
