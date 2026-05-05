import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Workspaces from "./bar/workspaces/Workspaces"
import Spotify from "./bar/spotify/Spotify"
import Clock from "./bar/clock/Clock"
import Cpu from "./bar/cpu/Cpu"
import Ram from "./bar/ram/Ram"
import Disk from "./bar/disk/Disk"
import Network from "./bar/network/Network"
import { config } from "@lib/config"

export default function Bar(gdkmonitor: Gdk.Monitor) {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
	const connector = gdkmonitor.get_connector() ?? ""

	const layout = config.bar.layouts[connector] ?? config.bar.layouts["*"]
	if (!layout) return null

	const renderSlot = (names: string[]) => names.flatMap(name => {
		switch (name) {
			case "workspaces": return [<Workspaces monitorConnector={connector} />]
			case "clock": return [<Clock />]
			case "spotify": return [<Spotify />]
			case "cpu": return [<Cpu />]
			case "ram": return [<Ram />]
			case "disk": return [<Disk />]
			case "network": return [<Network />]
			default: return []
		}
	})

	return (
		<window
			visible
			name={`bar-${connector}`}
			class="Bar"
			gdkmonitor={gdkmonitor}
			exclusivity={Astal.Exclusivity.EXCLUSIVE}
			anchor={TOP | LEFT | RIGHT}
			application={app}
		>
			<centerbox>
				<box $type="start">{renderSlot(layout.left)}</box>
				<box $type="center">{renderSlot(layout.center)}</box>
				<box $type="end">{renderSlot(layout.right)}</box>
			</centerbox>
		</window>
	)
}
