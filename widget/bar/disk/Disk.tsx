import Gio from "gi://Gio";
import { pollInterval } from "@lib/config";
import { formatBytes } from "@lib/units";
import { SysInfo } from "@widget/SysInfo";

function readDiskFree(): number {
	const file = Gio.File.new_for_path("/");
	const info = file.query_filesystem_info(
		Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE,
		null,
	);
	return info.get_attribute_uint64(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE);
}

export function Disk() {
	return (
		<SysInfo
			class="disk-container"
			icon="󰋊 "
			initial="0 GiB"
			interval={pollInterval("disk")}
			poll={() => formatBytes(readDiskFree(), 0)}
		/>
	);
}
