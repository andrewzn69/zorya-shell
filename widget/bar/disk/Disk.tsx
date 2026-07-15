import Gio from "gi://Gio"
import SysInfo from "@widget/SysInfo"
import { formatBytes } from "@lib/units"

function readDiskFree(): number {
	const file = Gio.File.new_for_path('/')
	const info = file.query_filesystem_info(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE, null)
	return info.get_attribute_uint64(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE)
}

export default function Disk() {
	return <SysInfo class="disk-container" initial="0 GiB" icon="󰋊 " poll={() => formatBytes(readDiskFree(), 0)} />
}
