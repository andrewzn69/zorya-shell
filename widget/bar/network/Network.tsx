import GLib from "gi://GLib"
import SysInfo from "@widget/SysInfo"
import { formatBytes } from "@lib/units"
import { pollInterval } from "@lib/config"

const RX_BYTES_FIELD = 1
const TX_BYTES_FIELD = 9

const ROUTE_IFACE_FIELD = 0
const ROUTE_DESTINATION_FIELD = 1
const ROUTE_METRIC_FIELD = 6
const ROUTE_MASK_FIELD = 7
const ANY_ADDRESS = '00000000'

interface Sample {
	iface: string
	rxBytes: number
	txBytes: number
}

function readLines(path: string): string[] {
	const [, contents] = GLib.file_get_contents(path)
	return new TextDecoder().decode(contents).split('\n')
}

function defaultRouteIface(): string | null {
	const routes = readLines('/proc/net/route')
					.map(line => line.trim().split(/\s+/))
					.filter(fields => fields[ROUTE_DESTINATION_FIELD] === ANY_ADDRESS && fields[ROUTE_MASK_FIELD] === ANY_ADDRESS)
					.sort((a, b) => parseInt(a[ROUTE_METRIC_FIELD]) - parseInt(b[ROUTE_METRIC_FIELD]))
	return routes.length > 0 ? routes[0][ROUTE_IFACE_FIELD] : null
}

function readSample(): Sample | null {
	const iface = defaultRouteIface()
	if (!iface) return null

	const line = readLines('/proc/net/dev').find(entry => entry.trim().startsWith(`${iface}:`))
	if (!line) return null

	const fields = line.trim().split(/\s+/)
	return {
		iface,
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
		// counters of two different interfaces can't be subtracted
		if (previous && current && previous.iface === current.iface) {
			rxBytes = Math.max(0, current.rxBytes - previous.rxBytes)
			txBytes = Math.max(0, current.txBytes - previous.txBytes)
		}
		previous = current
		return `󰜷 ${formatBytes(txBytes / intervalSec, 2)}/s  󰜮 ${formatBytes(rxBytes / intervalSec, 2)}/s`
	}

	return <SysInfo class="network-container" initial="󰜷 0.00 KiB/s  󰜮 0.00 KiB/s" interval={pollInterval("network")} poll={poll} valueWidth={24} />
}
