import Mpris from "gi://AstalMpris"
// import Gtk from "gi://Gtk?version=4.0"
import { createPoll } from "ags/time"
import { createState } from "ags"

const MARQUEE_LEN = 35
const MARQUEE_SPEED = 80

export default function Spotify() {
	const spotify = Mpris.Player.new("spotify")

	const [isVisible, setIsVisible] = createState(false)
	const [rawText, setRawText] = createState("")

	let marqueeOffset = 0
	let prevRaw = ""

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
		const st = spotify.playback_status
		if (st === Mpris.PlaybackStatus.PLAYING) {
			setRawText(spotify.artist ? `${spotify.artist} \u2013 ${spotify.title}` : spotify.title)
		} else {
			setRawText("Paused")
		}
	}

	update()
	spotify.connect("notify::title", update)
	spotify.connect("notify::artist", update)
	spotify.connect("notify::playback-status", update)
	spotify.connect("notify::available", update)

	return (
		<box class="spotify-container" visible={isVisible}>
			<label class="spotify-track" label={displayText} />
		</box>
	)
}
