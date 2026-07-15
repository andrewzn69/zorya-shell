import Gio from "gi://Gio"
import SysInfo from "@widget/SysInfo"

function readDisk(): number {
	const file = Gio.File.new_for_path('/')
	const info = file.query_filesystem_info(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE, null)
	return info.get_attribute_uint64(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE) / 1073741824  // GiB
}

export default function Disk() {
	return <SysInfo class="disk-container" initial="0 GiB" icon="󰋊 " poll={() => `${readDisk().toFixed(0)} GiB`} />
}
