import Mpris from "gi://AstalMpris"
import Gtk from "gi://Gtk?version=4.0"
import { createPoll } from "ags/time"
import { createState } from "ags"

const FRAME_MS = 16
const SCROLL_SPEED = 0.5
const HOLD_FRAMES_TITLE = 1875   // ~30s total for title
const HOLD_FRAMES_META = 312     // ~5s for artist/album
const HOLD_FRAMES_END_INITIAL = 90   // ~1.5s for first two ends
const HOLD_FRAMES_END_REPEAT = 312   // ~5s after first full bounce
const FADE_FRAMES = 45           // ~720ms

const enum Phase { SCROLLING, HOLDING, FADE_OUT, FADE_IN }

export default function Spotify() {
	const spotify = Mpris.Player.new("spotify")
	const [isVisible, setIsVisible] = createState(false)

	const label = new Gtk.Label()
	label.css_classes = ['spotify-track']
	label.single_line_mode = true

	const sw = new Gtk.ScrolledWindow()
	sw.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.NEVER)
	sw.set_min_content_width(150)
	sw.set_max_content_width(150)
	sw.set_child(label)

	let fields: string[] = []
	let idx = 0
	let phase = Phase.SCROLLING
	let pixelOffset = 0
	let counter = 0
	let scrollDir = 1       // 1 = forward, -1 = backward (title bounce only)
	let scrollWait = 0      // frames to wait at bounce end
	let titleTimer = 0      // total frames elapsed for current title display
	let bounceCount = 0     // how many ends reached so far

	const _tick = createPoll("", FRAME_MS, () => {
		const adj = sw.get_hadjustment()
		if (!adj || fields.length === 0 || adj.page_size <= 0) return ""

		switch (phase) {
			case Phase.SCROLLING: {
				// Initial wait before scrolling starts
				if (counter < HOLD_FRAMES_END_INITIAL) {
					counter++
					if (idx === 0) titleTimer++
					break
				}

				const maxScroll = adj.upper - adj.page_size

				if (maxScroll <= 0) {
					// Text fits — go to hold with pre-scroll time already counted
					phase = Phase.HOLDING
					counter = HOLD_FRAMES_END_INITIAL
					break
				}

				if (idx === 0) {
					// Title: bounce back and forth until 30s elapsed
					titleTimer++
					if (titleTimer >= HOLD_FRAMES_TITLE) {
						label.css_classes = ['spotify-track', 'faded']
						phase = Phase.FADE_OUT
						counter = 0
						break
					}

					if (scrollWait > 0) {
						scrollWait--
						break
					}

					pixelOffset += SCROLL_SPEED * scrollDir
					if (pixelOffset >= maxScroll) {
						pixelOffset = maxScroll
						adj.value = pixelOffset
						scrollDir = -1
						bounceCount++
						scrollWait = HOLD_FRAMES_END_INITIAL  // right end: always 1.5s
					} else if (pixelOffset <= 0) {
						pixelOffset = 0
						adj.value = 0
						scrollDir = 1
						bounceCount++
						scrollWait = HOLD_FRAMES_END_REPEAT   // left end: always 5s
					} else {
						adj.value = pixelOffset
					}
				} else {
					// Artist/album: scroll to end then fade
					pixelOffset += SCROLL_SPEED
					if (pixelOffset >= maxScroll) {
						pixelOffset = maxScroll
						adj.value = pixelOffset
						phase = Phase.HOLDING
						counter = HOLD_FRAMES_META - HOLD_FRAMES_END_INITIAL
					} else {
						adj.value = pixelOffset
					}
				}
				break
			}
			case Phase.HOLDING: {
				const holdFrames = idx === 0 ? HOLD_FRAMES_TITLE : HOLD_FRAMES_META
				if (++counter >= holdFrames) {
					label.css_classes = ['spotify-track', 'faded']
					phase = Phase.FADE_OUT
					counter = 0
				}
				break
			}
			case Phase.FADE_OUT:
				if (++counter >= FADE_FRAMES) {
					if (fields.length > 1) idx = (idx + 1) % fields.length
					label.label = fields[idx] ?? ""
					pixelOffset = 0
					adj.value = 0
					label.css_classes = ['spotify-track']
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
		return ""
	})

	const reset = (i: number) => {
		idx = i
		phase = Phase.SCROLLING
		pixelOffset = 0
		counter = 0
		scrollDir = 1
		scrollWait = 0
		titleTimer = 0
		bounceCount = 0
		label.css_classes = ['spotify-track']
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
		>
			{/* hidden label reads _tick, activating the createPoll timer */}
			<label visible={false} label={_tick} />
		</box>
	)
}
