import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { createPoll } from "ags/time"
import { createState } from "ags"

let prevCpuIdle = 0, prevCpuTotal = 0
function readCpu(): number {
	const [, b] = GLib.file_get_contents('/proc/stat')
	const nums = new TextDecoder().decode(b).split('\n')[0].split(/\s+/).slice(1).map(Number)
	const idle = nums[3] + nums[4]
	const total = nums.reduce((a, n) => a + n, 0)
	const pct = prevCpuTotal > 0 ? Math.round((1 - (idle - prevCpuIdle) / (total - prevCpuTotal)) * 100) : 0
	prevCpuIdle = idle; prevCpuTotal = total
	return Math.max(0, Math.min(100, pct))
}

function readRam(): number {
	const [, b] = GLib.file_get_contents('/proc/meminfo')
	const text = new TextDecoder().decode(b)
	const get = (k: string) => parseInt(text.match(new RegExp(k + ':\\s+(\\d+)'))?.[1] ?? '0')
	return (get('MemTotal') - get('MemAvailable')) / 1048576  // GB
}

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

function readDisk(): number {
	const file = Gio.File.new_for_path('/')
	const info = file.query_filesystem_info(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE, null)
	return info.get_attribute_uint64(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE) / 1073741824  // GB
}

function fmtBytes(b: number): string {
	if (b > 1048576) return `${(b / 1048576).toFixed(1)}M`
	if (b > 1024)    return `${(b / 1024).toFixed(0)}K`
	return `${b}B`
}

export default function SysInfo() {
	const [cpu, setCpu]   = createState("0%")
	const [ram, setRam]   = createState("0.0G")
	const [net, setNet]   = createState("↑ 0K ↓ 0K")
	const [disk, setDisk] = createState("0G")

	const _tick = createPoll("", 2000, () => {
		setCpu(`${readCpu()}%`)
		setRam(`${readRam().toFixed(1)}G`)
		const n = readNet()
		setNet(`↑ ${fmtBytes(n.tx)} ↓ ${fmtBytes(n.rx)}`)
		setDisk(`${readDisk().toFixed(0)}G`)
		return ""
	})

	return (
		<box class="sysinfo-container" spacing={8}>
			<label visible={false} label={_tick} />
			<box class="sysinfo-item">
				<label label="CPU " />
				<label class="sysinfo-value" label={cpu} />
			</box>
			<box class="sysinfo-item">
				<label label="RAM " />
				<label class="sysinfo-value" label={ram} />
			</box>
			<box class="sysinfo-item">
				<label class="sysinfo-value" label={net} />
			</box>
			<box class="sysinfo-item">
				<label label="/ " />
				<label class="sysinfo-value" label={disk} />
			</box>
		</box>
	)
}
