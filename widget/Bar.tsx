import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import { createPoll } from "ags/time"

const hyprland = Hyprland.get_default()

function Workspaces({ monitorId }: { monitorId: number }) {
	// get all workspaces from hyprland
	const allWorkspaces = hyprland.get_workspaces()

	// filter workspaces assignerd to this monitor
	const monitorWorkspaces = allWorkspaces.filter(ws => {
		const wsMonitor = hyprland.get_monitor(ws.get_monitor())
		return wsMonitor?.get_id() === monitorId
	})

	return (
		<box cssName="workspaces-container">
			<box cssName="workspaces" spacing={8}>
				{monitorWorkspaces.map((workspace) => {
					const id = workspace.get_id()
					const isEmpty = workspace.get_clients().length === 0
					const isActive = hyprland.get_focused_workspace()?.get_id() === id

					return (
						<button cssName={`workspace ${isActive ? 'active' : ''} ${isEmpty ? 'empty' : 'occupied'}`} onClicked={() => hyprland.dispatch(`workspace ${id}`)}>
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
		<box cssName="spotify-container">
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
		<box cssName="clock-container">
			<label label={time} />
		</box>
	)
}

export default function Bar(gdkmonitor: Gdk.Monitor) {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
	const monitorId = app.get_monitors().indexOf(gdkmonitor)

	if (monitorId === 0) {
		return (
			<window
				visible
				name={`bar-${monitorId}`}
				cssName="Bar"
				gdkmonitor={gdkmonitor}
				exclusivity={Astal.Exclusivity.EXCLUSIVE}
				anchor={TOP | LEFT | RIGHT}
				application={app}
			>
				<centerbox>
					<box $type="start">
						<Workspaces monitorId={monitorId} />
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
	} else {
		return (
			<window
				visible
				name={`bar-${monitorId}`}
				cssName="Bar"
				gdkmonitor={gdkmonitor}
				exclusivity={Astal.Exclusivity.EXCLUSIVE}
				anchor={TOP | LEFT | RIGHT}
				application={app}
			>
				<box>
					<Workspaces monitorId={monitorId} />
				</box>
			</window>
		)
	}
}
