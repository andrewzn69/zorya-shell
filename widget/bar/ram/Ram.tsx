import GLib from "gi://GLib";
import { pollInterval } from "@lib/config";
import { formatBytes } from "@lib/units";
import SysInfo from "@widget/SysInfo";

function readRamUsed(): number {
	const [, b] = GLib.file_get_contents("/proc/meminfo");
	const text = new TextDecoder().decode(b);
	const get = (k: string) =>
		Number.parseInt(text.match(new RegExp(`${k}:\\s+(\\d+)`))?.[1] ?? "0", 10);
	return (get("MemTotal") - get("MemAvailable")) * 1024;
}

export default function Ram() {
	return (
		<SysInfo
			class="ram-container"
			icon={"  "}
			initial="0.0 GiB"
			interval={pollInterval("ram")}
			poll={() => formatBytes(readRamUsed(), 1)}
		/>
	);
}
