import GLib from "gi://GLib"
import SysInfo from "@widget/SysInfo"

// Auto-scale byte delta to KiB/s or MiB/s over the elapsed interval (seconds)
function toRate(b: number, dt: number): string {
	const bps = b / dt
	if (bps >= 1048576) return `${(bps / 1048576).toFixed(2)} MiB/s`
	return `${(bps / 1024).toFixed(2)} KiB/s`
}

export default function Network() {
	let prevRx = 0, prevTx = 0
	const readNet = (): { rx: number, tx: number } => {
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

	const poll = (dt: number) => {
		const n = readNet()
		return `󰕒 ${toRate(n.tx, dt)}  󰇚 ${toRate(n.rx, dt)}`
	}

	return <SysInfo class="network-container" initial="󰕒 0.00 KiB/s  󰇚 0.00 KiB/s" poll={poll} valueWidth={24} />
}
