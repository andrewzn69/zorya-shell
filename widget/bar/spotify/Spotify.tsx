import Mpris from "gi://AstalMpris"
import Gtk from "gi://Gtk?version=4.0"
import { createPoll } from "ags/time"
import { createState } from "ags"

const FRAME_MS = 16
const SCROLL_SPEED = 2     // px per frame
const HOLD_FRAMES = 120    // ~2s hold after scroll ends (or for short text)
const FADE_FRAMES = 15     // ~240ms fade

const enum Phase { SCROLLING, HOLDING, FADE_OUT, FADE_IN }

export default function Spotify() {
	const spotify = Mpris.Player.new("spotify")
	const [isVisible, setIsVisible] = createState(false)

	const label = new Gtk.Label()
	label.css_classes = ['spotify-track']
	label.single_line_mode = true

	// ScrolledWindow reports natural width via max_content_width,
	// unlike Gtk.Viewport which propagates the child's full natural size.
	const sw = new Gtk.ScrolledWindow()
	sw.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.NEVER)
	sw.set_min_content_width(280)
	sw.set_max_content_width(280)
	sw.set_child(label)

	let fields: string[] = []
	let idx = 0
	let phase = Phase.SCROLLING
	let pixelOffset = 0
	let counter = 0

	createPoll(0, FRAME_MS, () => {
		if (fields.length === 0) return 0

		const adj = sw.get_hadjustment()
		if (!adj) return 0

		// TODO: remove debug
		if (counter === 0) console.log(`[spotify] upper=${adj.upper} page=${adj.page_size} label="${label.label}"`)

		// Wait for widget to be realized and laid out
		if (adj.page_size <= 0) return 0


		switch (phase) {
			case Phase.SCROLLING: {
				const maxScroll = adj.upper - adj.page_size
				if (maxScroll <= 0) {
					// Text fits — skip straight to hold
					phase = Phase.HOLDING
					counter = 0
				} else {
					pixelOffset += SCROLL_SPEED
					if (pixelOffset >= maxScroll) {
						pixelOffset = maxScroll
						adj.value = pixelOffset
						phase = Phase.HOLDING
						counter = 0
					} else {
						adj.value = pixelOffset
					}
				}
				break
			}
			case Phase.HOLDING:
				if (++counter >= HOLD_FRAMES) {
					label.opacity = 0
					phase = Phase.FADE_OUT
					counter = 0
				}
				break
			case Phase.FADE_OUT:
				if (++counter >= FADE_FRAMES) {
					if (fields.length > 1) idx = (idx + 1) % fields.length
					label.label = fields[idx] ?? ""
					pixelOffset = 0
					adj.value = 0
					label.opacity = 1
					phase = Phase.FADE_IN
					counter = 0
				}
				break
			case Phase.FADE_IN:
				if (++counter >= FADE_FRAMES) {
					phase = Phase.SCROLLING
					counter = 0
				}
				break
		}
		return 0
	})

	const reset = (i: number) => {
		idx = i
		phase = Phase.SCROLLING
		pixelOffset = 0
		counter = 0
		label.opacity = 1
		label.label = fields[i] ?? ""
		const adj = sw.get_hadjustment()
		if (adj) adj.value = 0
	}

	const update = () => {
		if (!spotify.available) {
			setIsVisible(false)
			return
		}
		setIsVisible(true)

		if (spotify.playback_status === Mpris.PlaybackStatus.PLAYING) {
			const newFields = ([
				spotify.title,
				spotify.artist,
				spotify.album,
			] as string[]).filter(Boolean)

			const titleChanged = newFields[0] !== fields[0]
			fields = newFields
			if (titleChanged) reset(0)
		} else {
			fields = ["Paused"]
			reset(0)
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
			visible={isVisible}
			halign={Gtk.Align.CENTER}
			onRealize={(self: Gtk.Box) => self.append(sw)}
		/>
	)
}
