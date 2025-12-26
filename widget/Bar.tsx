import barConfig from "../config.json"
import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import { createPoll } from "ags/time"

const hyprland = Hyprland.get_default()

function Workspaces({ monitorConnector }: { monitorConnector: string }) {
	// get all workspaces from hyprland
	const allWorkspaces = hyprland.get_workspaces()
	const monitorName = gdkmonitor.model

	// filter workspaces assignerd to this monitor
	const monitorWorkspaces = allWorkspaces.filter(ws => {
		const wsMonitor = hyprland.get_monitor(ws.get_monitor())
		return wsMonitor?.get_name() === monitorConnector
	}).sort((a, b) => a.get_id() - b.get_id())

	return (
		<box class="workspaces-container">
			<box class="workspaces" spacing={8}>
				{monitorWorkspaces.map((workspace) => {
					const id = workspace.get_id()
					const isEmpty = workspace.get_clients().length === 0
					const isActive = hyprland.get_focused_workspace()?.get_id() === id

					return (
						<button class={`workspace ${isActive ? 'active' : ''} ${isEmpty ? 'empty' : 'occupied'}`} onClicked={() => hyprland.dispatch("workspace", `${id}`)}>
							<label label={`${id}`} />
						</button>
					)
				})}
			</box>
		</box>
	)
}

function Spotify() {
	return (
		<box class="spotify-container">
			<label label=" Paused" />
		</box>
	)
}

function Clock() {
	const time = createPoll("", 1000, () => {
		const date = new Date()
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
	})

	return (
		<box class="clock-container">
			<label label={time} />
		</box>
	)
}

export default function Bar(gdkmonitor: Gdk.Monitor) {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
	const monitorConnector = gdkmonitor.get_connector()
	const hyprMonitor = hyprland.get_monitors().find(m => m.get_name() === monitorConnector)
	const monitorId = hyprMonitor?.get_id().toString() || "0"
	const role = barConfig.monitors[monitorId] || "tertiary"

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
		// TODO: Add Volume, CPU, RAM widgets later
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
				<box $type="center">
					<label label="TODO: System info" />
				</box>
				<box $type="end">
					<Clock />
				</box>
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
