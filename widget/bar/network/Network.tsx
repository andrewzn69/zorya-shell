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

function fmtBytes(b: number): string {
	if (b > 1048576) return `${(b / 1048576).toFixed(1)}M`
	if (b > 1024) return `${(b / 1024).toFixed(0)}K`
	return `${b}B`
}

export default function Network() {
	const [val, setVal] = createState("󰕒 0K  󰇚 0K")
	const _tick = createPoll("", 2000, () => {
		const n = readNet()
		setVal(`󰕒 ${fmtBytes(n.tx)}  󰇚 ${fmtBytes(n.rx)}`)
		return ""
	})

	return (
		<box class="network-container">
			<label visible={false} label={_tick} />
			<label class="sysinfo-value" label={val} />
		</box>
	)
}
