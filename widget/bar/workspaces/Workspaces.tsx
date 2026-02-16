import barConfig from "../../../config.json"
import Hyprland from "gi://AstalHyprland"
import { createState } from "ags"

const hyprland = Hyprland.get_default()

interface WorkspaceRule {
	workspaceString: string
	monitor: string
}

function WorkspaceButton({ wsId }: { wsId: number }) {
	const [classes, setClasses] = createState("")

	const updateClasses = () => {
		const workspaces = hyprland.get_workspaces()
		const focused = hyprland.get_focused_workspace()
		const existingWs = workspaces.find((w: Hyprland.Workspace) => w.get_id() === wsId)
		const isEmpty = !existingWs || existingWs.get_clients().length === 0
		const isActive = focused?.get_id() === wsId

		setClasses(`workspace ${isActive ? 'active' : ''} ${isEmpty ? 'empty' : 'occupied'}`)
	}

	updateClasses()
	hyprland.connect("notify::workspaces", updateClasses)
	hyprland.connect("notify::focused-workspace", updateClasses)
	hyprland.connect("notify::clients", updateClasses)

	return (
		<button
			class={classes}
			onClicked={() => hyprland.dispatch("workspace", `${wsId}`)}
		>
			<label label={`${wsId}`} />
		</button>
	)
}

export default function Workspaces({ monitorConnector }: { monitorConnector: string }) {
	const workspaceRulesJson = hyprland.message("j/workspacerules")
	const workspaceRules: WorkspaceRule[] = JSON.parse(workspaceRulesJson)

	const assignedWorkspaces = workspaceRules
		.filter(rule => rule.monitor === monitorConnector)
		.map(rule => parseInt(rule.workspaceString))
		.sort((a, b) => a - b)

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
