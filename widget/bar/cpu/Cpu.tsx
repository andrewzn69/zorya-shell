import GLib from "gi://GLib";
import { pollInterval } from "@lib/config";
import { SysInfo } from "@widget/SysInfo";

const IDLE_FIELD = 3;
const IOWAIT_FIELD = 4;
// guest and guest_nice are already part of user and nice
const COUNTED_FIELDS = 8;

interface Sample {
	idle: number;
	total: number;
}

function readSample(): Sample {
	const [, contents] = GLib.file_get_contents("/proc/stat");
	const cpuLine = new TextDecoder().decode(contents).split("\n")[0];
	const [, ...fields] = cpuLine.trim().split(/\s+/u);
	const ticks = fields.slice(0, COUNTED_FIELDS).map(Number);
	return {
		idle: ticks[IDLE_FIELD] + ticks[IOWAIT_FIELD],
		total: ticks.reduce((sum, value) => sum + value, 0),
	};
}

export function Cpu() {
	let previous: Sample | null = null;

	const poll = () => {
		const current = readSample();
		let percent = 0;
		if (previous) {
			const busy =
				1 - (current.idle - previous.idle) / (current.total - previous.total);
			percent = Math.round(busy * 100);
		}
		previous = current;
		return `${Math.max(0, Math.min(100, percent))}%`;
	};

	return (
		<SysInfo
			class="cpu-container"
			icon=" "
			initial="0%"
			interval={pollInterval("cpu")}
			poll={poll}
		/>
	);
}
