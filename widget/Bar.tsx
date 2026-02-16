import barConfig from "../config.json"
import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import Workspaces from "./bar/workspaces/Workspaces"
import Spotify from "./bar/spotify/Spotify"
import Clock from "./bar/clock/Clock"
import Cpu from "./bar/cpu/Cpu"
import Ram from "./bar/ram/Ram"
import Disk from "./bar/disk/Disk"
import Network from "./bar/network/Network"

const hyprland = Hyprland.get_default()

export default function Bar(gdkmonitor: Gdk.Monitor) {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
	const monitorConnector = gdkmonitor.get_connector()
	if (!monitorConnector) return <box />
	const hyprMonitor = hyprland.get_monitors().find((m: Hyprland.Monitor) => m.get_name() === monitorConnector)
	const monitorId = hyprMonitor?.get_id().toString() || "0"
	const role = (barConfig.monitors as Record<string, string>)[monitorId] || "tertiary"

	if (role === "primary") {
		return (
			<window
				visible
				name={`bar-${monitorConnector}`}
				class="Bar"
				gdkmonitor={gdkmonitor}
				exclusivity={Astal.Exclusivity.EXCLUSIVE}
				anchor={TOP | LEFT | RIGHT}
				application={app}
			>
				<centerbox>
					<box $type="start">
						<Workspaces monitorConnector={monitorConnector} />
					</box>
					<box $type="center">
						<Spotify />
					</box>
					<box $type="end">
						<Clock />
					</box>
				</centerbox>
			</window>
		)
	} else if (role === "secondary") {
		return (
			<window
				visible
				name={`bar-${monitorConnector}`}
				class="Bar"
				gdkmonitor={gdkmonitor}
				exclusivity={Astal.Exclusivity.EXCLUSIVE}
				anchor={TOP | LEFT | RIGHT}
				application={app}
			>
				<centerbox>
					<box $type="start">
						<Workspaces monitorConnector={monitorConnector} />
					</box>
					<box $type="center">
						<Cpu />
						<Ram />
						<Disk />
					</box>
					<box $type="end">
						<Network />
						<Clock />
					</box>
				</centerbox>
			</window>
		)
	} else {
		// tertiary or fallback (just workspaces)
		return (
			<window
				visible
				name={`bar-${monitorConnector}`}
				class="Bar"
				gdkmonitor={gdkmonitor}
				exclusivity={Astal.Exclusivity.EXCLUSIVE}
				anchor={TOP | LEFT | RIGHT}
				application={app}
			>
				<box>
					<Workspaces monitorConnector={monitorConnector} />
				</box>
			</window>
		)
	}
}
