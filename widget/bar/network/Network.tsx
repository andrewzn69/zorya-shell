import GLib from "gi://GLib"
import { createPoll } from "ags/time"
import { createState } from "ags"

let prevRx = 0, prevTx = 0
function readNet(): { rx: number, tx: number } {
	const [, b] = GLib.file_get_contents('/proc/net/dev')
	const line = new TextDecoder().decode(b).split('\n')
		.find(l => l.includes(':') && !l.trim().startsWith('lo') && !l.includes('Inter'))
	if (!line) return { rx: 0, tx: 0 }
	const p = line.trim().split(/\s+/)
	const rx = parseInt(p[1]), tx = parseInt(p[9])
	const dRx = Math.max(0, rx - prevRx), dTx = Math.max(0, tx - prevTx)
	prevRx = rx; prevTx = tx
	return { rx: dRx, tx: dTx }
}

// Always MB/s (2s poll interval → divide delta by 2)
function toMBs(b: number): string {
	return (b / 2 / 1048576).toFixed(2)
}

export default function Network() {
	const [val, setVal] = createState("󰕒 0.00  󰇚 0.00 MB/s")
	const _tick = createPoll("", 2000, () => {
		const n = readNet()
		setVal(`󰕒 ${toMBs(n.tx)}  󰇚 ${toMBs(n.rx)} MB/s`)
		return ""
	})

	return (
		<box class="network-container">
			<label visible={false} label={_tick} />
			<label class="sysinfo-value" label={val} widthChars={24} xalign={0} />
		</box>
	)
}
