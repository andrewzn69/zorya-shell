import Mpris from "gi://AstalMpris"
import Gtk from "gi://Gtk?version=4.0"
import { createPoll } from "ags/time"
import { createState } from "ags"

const SCROLL_SPEED = 1    // px per frame
const FRAME_MS = 16       // ~60fps
const FADE_FRAMES = 25    // frames for fade transition (~400ms at 60fps, matches CSS)

const enum ScrollState { SCROLLING, FADING_OUT, FADING_IN }

export default function Spotify() {
	const spotify = Mpris.Player.new("spotify")

	const [isVisible, setIsVisible] = createState(false)
	const [trackText, setTrackText] = createState("")

	let scrollWin: Gtk.ScrolledWindow | null = null
	let labelWidget: Gtk.Label | null = null
	let pixelOffset = 0
	let state = ScrollState.SCROLLING
	let stateCounter = 0
	let prevText = ""

	createPoll(0, FRAME_MS, () => {
		if (!scrollWin || !labelWidget) return 0

		const text = trackText()
		if (text !== prevText) {
			prevText = text
			pixelOffset = 0
			state = ScrollState.SCROLLING
			stateCounter = 0
			labelWidget.opacity = 1
			const adj = scrollWin.get_hadjustment()
			if (adj) adj.value = 0
			return 0
		}

		const adj = scrollWin.get_hadjustment()
		if (!adj) return 0
		const maxScroll = adj.upper - adj.page_size

		if (maxScroll <= 0) {
			adj.value = 0
			pixelOffset = 0
			return 0
		}

		switch (state) {
			case ScrollState.SCROLLING:
				pixelOffset += SCROLL_SPEED
				if (pixelOffset >= maxScroll) {
					pixelOffset = maxScroll
					adj.value = pixelOffset
					labelWidget.opacity = 0
					state = ScrollState.FADING_OUT
					stateCounter = 0
				} else {
					adj.value = pixelOffset
				}
				break

			case ScrollState.FADING_OUT:
				stateCounter++
				if (stateCounter >= FADE_FRAMES) {
					pixelOffset = 0
					adj.value = 0
					labelWidget.opacity = 1
					state = ScrollState.FADING_IN
					stateCounter = 0
				}
				break

			case ScrollState.FADING_IN:
				stateCounter++
				if (stateCounter >= FADE_FRAMES) {
					state = ScrollState.SCROLLING
					stateCounter = 0
				}
				break
		}

		return 0
	})

	const update = () => {
		if (!spotify.available) {
			setIsVisible(false)
			return
		}
		setIsVisible(true)
		const st = spotify.playback_status
		if (st === Mpris.PlaybackStatus.PLAYING) {
			setTrackText(spotify.artist ? `${spotify.artist} \u2013 ${spotify.title}` : spotify.title)
		} else {
			setTrackText("Paused")
		}
	}

	update()
	spotify.connect("notify::title", update)
	spotify.connect("notify::artist", update)
	spotify.connect("notify::playback-status", update)
	spotify.connect("notify::available", update)

	return (
		<box class="spotify-container" visible={isVisible}>
			<scrolledwindow
				onRealize={(self: Gtk.ScrolledWindow) => {
					scrollWin = self
					self.hscrollbar_policy = Gtk.PolicyType.EXTERNAL
					self.vscrollbar_policy = Gtk.PolicyType.NEVER
					self.min_content_width = 280
					self.max_content_width = 280
				}}
			>
				<label
					class="spotify-track"
					label={trackText}
					onRealize={(self: Gtk.Label) => {
						labelWidget = self
						self.single_line_mode = true
					}}
				/>
			</scrolledwindow>
		</box>
	)
}
