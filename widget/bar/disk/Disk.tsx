import Gio from "gi://Gio"
import { createPoll } from "ags/time"
import { createState } from "ags"

function readDisk(): number {
	const file = Gio.File.new_for_path('/')
	const info = file.query_filesystem_info(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE, null)
	return info.get_attribute_uint64(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE) / 1073741824  // GiB
}

export default function Disk() {
	const [val, setVal] = createState("0 GiB")
	const _tick = createPoll("", 2000, () => { setVal(`${readDisk().toFixed(0)} GiB`); return "" })

	return (
		<box class="disk-container">
			<label visible={false} label={_tick} />
			<label class="sysinfo-icon" label="󰋊 " />
			<label class="sysinfo-value" label={val} />
		</box>
	)
}
