import GLib from "gi://GLib"
import SysInfo from "@widget/SysInfo"

function readRam(): number {
	const [, b] = GLib.file_get_contents('/proc/meminfo')
	const text = new TextDecoder().decode(b)
	const get = (k: string) => parseInt(text.match(new RegExp(k + ':\\s+(\\d+)'))?.[1] ?? '0')
	return (get('MemTotal') - get('MemAvailable')) / 1048576  // GiB
}

export default function Ram() {
	return <SysInfo class="ram-container" initial="0.0 GiB" icon={"  "} poll={() => `${readRam().toFixed(1)} GiB`} />
}
