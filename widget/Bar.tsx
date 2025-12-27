import barConfig from "../config.json"
import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import { createPoll } from "ags/time"
import { createBinding } from "ags"

const hyprland = Hyprland.get_default()

function WorkspaceButton({ wsId }: { wsId: number }) {
	const workspaces = createBinding(hyprland, "workspaces")
	const focusedWorkspace = createBinding(hyprland, "focused-workspace")

	return workspaces((ws) => focusedWorkspace((focused) => {
		const existingWs = ws.find(w => w.get_id() === wsId)
		const isEmpty = !existingWs || existingWs.get_clients().length === 0
		const isActive = focused?.get_id() === wsId

		return (
			<button
				class={`workspace ${isActive ? 'active' : ''} ${isEmpty ? 'empty' : 'occupied'}`}
				onClicked={() => hyprland.dispatch("workspace", `${wsId}`)}
			>
				<label label={`${wsId}`} />
			</button>
		)
	}))
}

function Workspaces({ monitorConnector }: { monitorConnector: string }) {
	// query workspace rules via astalhyprland ipc
	const workspaceRulesJson = hyprland.message("j/workspacerules")
	const workspaceRules = JSON.parse(workspaceRulesJson)

	// get all workspace ids assigned to this monitor from rules
	const assignedWorkspaces = workspaceRules
		.filter(rule => rule.monitor === monitorConnector)
		.map(rule => parseInt(rule.workspaceString))
		.sort((a, b) => a - b)

	// get existing workspaces to check occupied/active status
	const existingWorkspaces = hyprland.get_workspaces()
	const focusedWorkspaceId = hyprland.get_focused_workspace()?.get_id()

	if (barConfig.debug) {
		console.log(`Monitor ${monitorConnector}: assigned workspaces = ${assignedWorkspaces}`)
	}

	return (
		<box class="workspaces-container">
			<box class="workspaces" spacing={8}>
				{assignedWorkspaces.map((wsId) => <WorkspaceButton wsId={wsId} />)}
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
				<centerbox>
					<box $type="start">
						<Workspaces monitorConnector={monitorConnector} />
					</box>
					<box $type="center">
						<label label="TODO: System info" />
					</box>
					<box $type="end">
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
