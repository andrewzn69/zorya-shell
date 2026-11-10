import GLib from "gi://GLib";
import { pollInterval } from "@lib/config";
import { formatBytes } from "@lib/units";
import { SysInfo } from "@widget/SysInfo";

const RX_BYTES_FIELD = 1;
const TX_BYTES_FIELD = 9;

const ROUTE_IFACE_FIELD = 0;
const ROUTE_DESTINATION_FIELD = 1;
const ROUTE_METRIC_FIELD = 6;
const ROUTE_MASK_FIELD = 7;
const ANY_ADDRESS = "00000000";

interface Sample {
	iface: string;
	rxBytes: number;
	txBytes: number;
	monotonicTimeUs: number;
}

function readLines(path: string): string[] {
	const [, contents] = GLib.file_get_contents(path);
	return new TextDecoder().decode(contents).split("\n");
}

function defaultRouteIface(): string | null {
	const routes = readLines("/proc/net/route")
		.map((line) => line.trim().split(/\s+/u))
		.filter(
			(fields) =>
				fields[ROUTE_DESTINATION_FIELD] === ANY_ADDRESS &&
				fields[ROUTE_MASK_FIELD] === ANY_ADDRESS,
		)
		.sort(
			(a, b) =>
				Number.parseInt(a[ROUTE_METRIC_FIELD], 10) -
				Number.parseInt(b[ROUTE_METRIC_FIELD], 10),
		);
	if (routes.length === 0) {
		return null;
	}
	return routes[0][ROUTE_IFACE_FIELD];
}

function readSample(): Sample | null {
	const iface = defaultRouteIface();
	if (!iface) {
		return null;
	}

	const line = readLines("/proc/net/dev").find((entry) =>
		entry.trim().startsWith(`${iface}:`),
	);
	if (!line) {
		return null;
	}

	const fields = line.trim().split(/\s+/u);
	return {
		iface,
		rxBytes: Number.parseInt(fields[RX_BYTES_FIELD], 10),
		txBytes: Number.parseInt(fields[TX_BYTES_FIELD], 10),
		monotonicTimeUs: GLib.get_monotonic_time(),
	};
}

export function Network() {
	// a rate needs two samples a full interval apart, so the first poll only takes one
	let previous: Sample | null = null;

	const poll = () => {
		const current = readSample();
		let rxRate = 0;
		let txRate = 0;
		// counters of two different interfaces can't be subtracted
		if (previous && current && previous.iface === current.iface) {
			const seconds =
				(current.monotonicTimeUs - previous.monotonicTimeUs) /
				GLib.USEC_PER_SEC;

			if (seconds > 0) {
				rxRate = Math.max(0, current.rxBytes - previous.rxBytes) / seconds;
				txRate = Math.max(0, current.txBytes - previous.txBytes) / seconds;
			}
		}
		previous = current;
		return `󰜷 ${formatBytes(txRate, 2)}/s  󰜮 ${formatBytes(rxRate, 2)}/s`;
	};

	return (
		<SysInfo
			class="network-container"
			initial="󰜷 0.00 KiB/s  󰜮 0.00 KiB/s"
			interval={pollInterval("network")}
			poll={poll}
			valueWidth={24}
		/>
	);
}
