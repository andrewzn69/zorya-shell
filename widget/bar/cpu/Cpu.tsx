import GLib from "gi://GLib"
import SysInfo from "@widget/SysInfo"
import { pollInterval } from "@lib/config"

export default function Cpu() {
	let prevIdle = 0, prevTotal = 0
	const readCpu = (): number => {
		const [, b] = GLib.file_get_contents('/proc/stat')
		const nums = new TextDecoder().decode(b).split('\n')[0].split(/\s+/).slice(1).map(Number)
		const idle = nums[3] + nums[4]
		const total = nums.reduce((a, n) => a + n, 0)
		const pct = prevTotal > 0 ? Math.round((1 - (idle - prevIdle) / (total - prevTotal)) * 100) : 0
		prevIdle = idle; prevTotal = total
		return Math.max(0, Math.min(100, pct))
	}
	return <SysInfo class="cpu-container" initial="0%" icon="󰍛 " interval={pollInterval("cpu")} poll={() => `${readCpu()}%`} />
}
