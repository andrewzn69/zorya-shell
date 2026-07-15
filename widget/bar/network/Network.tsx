import GLib from "gi://GLib"
import SysInfo from "@widget/SysInfo"
import { formatBytes } from "@lib/units"
import { pollInterval } from "@lib/config"

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
		return `󰕒 ${formatBytes(n.tx / dt, 2)}/s  󰇚 ${formatBytes(n.rx / dt, 2)}/s`
	}

	return <SysInfo class="network-container" initial="󰕒 0.00 KiB/s  󰇚 0.00 KiB/s" interval={pollInterval("network")} poll={poll} valueWidth={24} />
}
