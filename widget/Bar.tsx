import barConfig from "../config.json"
import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import Mpris from "gi://AstalMpris"
import Gtk from "gi://Gtk?version=4.0"
import { createPoll } from "ags/time"
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

	updateClasses() // initial render
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

function Workspaces({ monitorConnector }: { monitorConnector: string }) {
	// query workspace rules via astalhyprland ipc
	const workspaceRulesJson = hyprland.message("j/workspacerules")
	const workspaceRules: WorkspaceRule[] = JSON.parse(workspaceRulesJson)

	// get all workspace ids assigned to this monitor from rules
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

function Spotify() {
	const spotify = Mpris.Player.new("spotify")

	const MARQUEE_LEN = 35
	const MARQUEE_SPEED = 150

	const [isVisible, setIsVisible] = createState(false)
	const [isExpanded, setIsExpanded] = createState(false)
	const [rawText, setRawText] = createState("")
	const [title, setTitle] = createState("")
	const [artist, setArtist] = createState("")
	const [album, setAlbum] = createState("")
	const [playIcon, setPlayIcon] = createState("\uF04B")

	let marqueeOffset = 0
	let prevRaw = ""

	// drives the collapsed label — scrolls when rawText exceeds MARQUEE_LEN chars
	const displayText = createPoll("", MARQUEE_SPEED, () => {
		const text = rawText()
		if (text !== prevRaw) {
			marqueeOffset = 0
			prevRaw = text
		}
		if (text.length <= MARQUEE_LEN) return text
		const padded = text + "   "
		const doubled = padded + padded
		const start = marqueeOffset % padded.length
		marqueeOffset++
		return doubled.slice(start, start + MARQUEE_LEN)
	})

	const update = () => {
		if (!spotify.available) {
			setIsVisible(false)
			return
		}
		setIsVisible(true)
		setTitle(spotify.title || "")
		setArtist(spotify.artist || "")
		setAlbum(spotify.album || "")

		const st = spotify.playback_status
		if (st === Mpris.PlaybackStatus.PLAYING) {
			setPlayIcon("\uF04C")  // pause icon
			setRawText(spotify.artist ? `${spotify.artist} \u2013 ${spotify.title}` : spotify.title)
		} else {
			setPlayIcon("\uF04B")  // play icon
			setRawText("Paused")
		}
	}

	update()
	spotify.connect("notify::title", update)
	spotify.connect("notify::artist", update)
	spotify.connect("notify::album", update)
	spotify.connect("notify::playback-status", update)
	spotify.connect("notify::available", update)

	return (
		<box
			class="spotify-container"
			vertical
			visible={isVisible}
			onRealize={(self: Gtk.Widget) => {
				const ctrl = new Gtk.EventControllerMotion()
				ctrl.connect("enter", () => setIsExpanded(true))
				ctrl.connect("leave", () => setIsExpanded(false))
				self.add_controller(ctrl)
			}}
		>
			<label class="spotify-track" label={displayText} />
			<box class="spotify-details" vertical visible={isExpanded} spacing={2}>
				<label class="spotify-title" label={title} xalign={0} />
				<label class="spotify-artist" label={artist} xalign={0} />
				<label class="spotify-album" label={album} xalign={0} />
				<box class="spotify-controls" spacing={8} halign={Gtk.Align.CENTER}>
					<button class="media-btn" onClicked={() => spotify.previous()}>
						<label label="\uF04A" />
					</button>
					<button class="media-btn" onClicked={() => spotify.play_pause()}>
						<label label={playIcon} />
					</button>
					<button class="media-btn" onClicked={() => spotify.next()}>
						<label label="\uF04E" />
					</button>
				</box>
			</box>
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
