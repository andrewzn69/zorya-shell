import { config } from "@lib/config";
import { Astal, type Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import Clock from "./bar/clock/Clock";
import Cpu from "./bar/cpu/Cpu";
import Disk from "./bar/disk/Disk";
import Network from "./bar/network/Network";
import Ram from "./bar/ram/Ram";
import Spotify from "./bar/spotify/Spotify";
import Workspaces from "./bar/workspaces/Workspaces";

export default function Bar(gdkmonitor: Gdk.Monitor) {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;
	const connector = gdkmonitor.get_connector() ?? "";

	const layout = config.bar.layouts[connector] ?? config.bar.layouts["*"];
	if (!layout) {
		return null;
	}

	const renderSlot = (names: string[]) =>
		names.flatMap((name) => {
			switch (name) {
				case "workspaces":
					return [<Workspaces monitorConnector={connector} />];
				case "clock":
					return [<Clock />];
				case "spotify":
					return [<Spotify />];
				case "cpu":
					return [<Cpu />];
				case "ram":
					return [<Ram />];
				case "disk":
					return [<Disk />];
				case "network":
					return [<Network />];
				default:
					return [];
			}
		});

	return (
		<window
			anchor={TOP | LEFT | RIGHT}
			application={app}
			class="Bar"
			exclusivity={Astal.Exclusivity.EXCLUSIVE}
			gdkmonitor={gdkmonitor}
			name={`bar-${connector}`}
			visible={true}
		>
			<centerbox>
				<box $type="start">{renderSlot(layout.left)}</box>
				<box $type="center">{renderSlot(layout.center)}</box>
				<box $type="end">{renderSlot(layout.right)}</box>
			</centerbox>
		</window>
	);
}
