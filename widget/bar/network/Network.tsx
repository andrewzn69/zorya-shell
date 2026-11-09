import GLib from "gi://GLib"
import SysInfo from "@widget/SysInfo"
import { formatBytes } from "@lib/units"
import { pollInterval } from "@lib/config"

const RX_BYTES_FIELD = 1
const TX_BYTES_FIELD = 9

interface Sample {
	rxBytes: number
	txBytes: number
}

function readSample(): Sample | null {
	const [, contents] = GLib.file_get_contents('/proc/net/dev')
	const lines = new TextDecoder().decode(contents).split('\n')
	const line = lines.find(entry => entry.includes(':') && !entry.trim().startsWith('lo'))
	if (!line) return null

	const fields = line.trim().split(/\s+/)
	return {
		rxBytes: parseInt(fields[RX_BYTES_FIELD]),
		txBytes: parseInt(fields[TX_BYTES_FIELD]),
	}
}

export default function Network() {
	// the counters are totals, so the first poll needs an earlier sample to subtract
	let previous = readSample()

	const poll = (intervalSec: number) => {
		const current = readSample()
		let rxBytes = 0, txBytes = 0
		if (previous && current) {
			rxBytes = Math.max(0, current.rxBytes - previous.rxBytes)
			txBytes = Math.max(0, current.txBytes - previous.txBytes)
		}
		previous = current
		return `󰜷 ${formatBytes(txBytes / intervalSec, 2)}/s  󰜮 ${formatBytes(rxBytes / intervalSec, 2)}/s`
	}

	return <SysInfo class="network-container" initial="󰜷 0.00 KiB/s  󰜮 0.00 KiB/s" interval={pollInterval("network")} poll={poll} valueWidth={24} />
}
