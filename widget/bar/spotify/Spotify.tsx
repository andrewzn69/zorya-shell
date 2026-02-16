import Mpris from "gi://AstalMpris"
import Gtk from "gi://Gtk?version=4.0"
import { createPoll } from "ags/time"
import { createState } from "ags"

const SCROLL_SPEED = 1   // px per frame
const FRAME_MS = 16      // ~60fps
const FADE_FRAMES = 25   // frames for opacity transition (~400ms)

const enum ScrollState { SCROLLING, FADING_OUT, FADING_IN }

export default function Spotify() {
	const spotify = Mpris.Player.new("spotify")

	const [isVisible, setIsVisible] = createState(false)

	// Gtk.Viewport is not a known gnim JSX intrinsic — create imperatively
	const label = new Gtk.Label()
	label.css_classes = ['spotify-track']
	label.single_line_mode = true

	const vp = new Gtk.Viewport()
	vp.hexpand = true
	vp.set_child(label)

	let pixelOffset = 0
	let scrollState = ScrollState.SCROLLING
	let stateCounter = 0
	let prevText = ""

	createPoll(0, FRAME_MS, () => {
		const adj = vp.get_hadjustment()
		if (!adj) return 0

		const text = label.label
		if (text !== prevText) {
			prevText = text
			pixelOffset = 0
			scrollState = ScrollState.SCROLLING
			stateCounter = 0
			label.opacity = 1
			adj.value = 0
			return 0
		}

		const maxScroll = adj.upper - adj.page_size
		// TODO: remove debug
		if (pixelOffset === 0) console.log(`spotify: upper=${adj.upper} page=${adj.page_size} max=${maxScroll}`)

		if (maxScroll <= 0) {
			adj.value = 0
			pixelOffset = 0
			return 0
		}

		switch (scrollState) {
			case ScrollState.SCROLLING:
				pixelOffset += SCROLL_SPEED
				if (pixelOffset >= maxScroll) {
					pixelOffset = maxScroll
					adj.value = pixelOffset
					label.opacity = 0
					scrollState = ScrollState.FADING_OUT
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
					label.opacity = 1
					scrollState = ScrollState.FADING_IN
					stateCounter = 0
				}
				break
			case ScrollState.FADING_IN:
				stateCounter++
				if (stateCounter >= FADE_FRAMES) {
					scrollState = ScrollState.SCROLLING
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
			label.label = spotify.artist
				? `${spotify.artist} \u2013 ${spotify.title}`
				: spotify.title
		} else {
			label.label = "Paused"
		}
	}

	update()
	spotify.connect("notify::title", update)
	spotify.connect("notify::artist", update)
	spotify.connect("notify::playback-status", update)
	spotify.connect("notify::available", update)

	return (
		<box
			class="spotify-container"
			visible={isVisible}
			onRealize={(self: Gtk.Box) => self.append(vp)}
		/>
	)
}
