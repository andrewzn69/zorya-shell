import Notifd from "gi://AstalNotifd"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import GdkPixbuf from "gi://GdkPixbuf"
import GLib from "gi://GLib"
import { Astal, Gdk as AGdk } from "ags/gtk4"
import app from "ags/gtk4/app"

const notifd = Notifd.get_default()
const NOTIF_WIDTH = 240
const NOTIF_MAX_CHARS = 30
const NOTIF_IMAGE_SIZE = 64
const NOTIF_DURATION = 5000
export const NOTIF_MONITOR = 1
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right"
const NOTIF_CORNER: Corner = "bottom-right"

const CORNER_ANCHOR: Record<Corner, number> = {
	"top-left": Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT,
	"top-right": Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT,
	"bottom-left": Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT,
	"bottom-right": Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.RIGHT,
}

const CORNER_VALIGN: Record<Corner, Gtk.Align> = {
	"top-left": Gtk.Align.START,
	"top-right": Gtk.Align.START,
	"bottom-left": Gtk.Align.END,
	"bottom-right": Gtk.Align.END,
}

export default function Notifications(monitor: AGdk.Monitor) {
	let listBox: Gtk.Box | null = null
	const popups = new Map<number, Gtk.Widget>()
	const timers = new Map<number, ReturnType<typeof setTimeout>>()
	const glibSources = new Map<number, number>()

	const remove = (id: number) => {
		const timer = timers.get(id)
		if (timer) clearTimeout(timer)
		timers.delete(id)
		const widget = popups.get(id)
		const src = glibSources.get(id)
		if (src && widget) (widget as Gtk.Widget).remove_tick_callback(src)
		glibSources.delete(id)
		if (widget && listBox) listBox.remove(widget)
		popups.delete(id)
	}

	const dismiss = (id: number) => {
		remove(id)
		const notif = notifd.get_notification(id)
		if (notif) notif.dismiss()
	}

	const addNotif = (id: number) => {
		if (!listBox) return
		const n = notifd.get_notification(id)
		if (!n) return

		const popup = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
		popup.css_classes = ["notif-popup"]
		popup.width_request = NOTIF_WIDTH

		const click = new Gtk.GestureClick()
		click.connect("released", () => dismiss(id))
		popup.add_controller(click)

		const image = n.get_image()
		const appIcon = n.get_app_icon()
		const hasImage = image && GLib.path_is_absolute(image) && GLib.file_test(image, GLib.FileTest.EXISTS)

		// right column: text + progress bar
		const column = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
		column.hexpand = true

		const textContent = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 })
		textContent.css_classes = ["notif-content"]
		textContent.vexpand = true

		const header = new Gtk.Box({ spacing: 4 })
		header.css_classes = ["notif-header"]
		const appLabel = new Gtk.Label({ label: n.get_app_name() ?? "" })
		appLabel.css_classes = ["notif-app"]
		appLabel.hexpand = true
		appLabel.xalign = 0
		header.append(appLabel)
		textContent.append(header)

		const summary = n.get_summary() ?? ""
		if (summary) {
			const lbl = new Gtk.Label({ label: summary })
			lbl.css_classes = ["notif-summary"]
			lbl.xalign = 0
			lbl.wrap = true
			lbl.max_width_chars = NOTIF_MAX_CHARS
			textContent.append(lbl)
		}

		const body = n.get_body() ?? ""
		if (body) {
			const lbl = new Gtk.Label({ label: body })
			lbl.css_classes = ["notif-body"]
			lbl.xalign = 0
			lbl.wrap = true
			lbl.max_width_chars = NOTIF_MAX_CHARS
			textContent.append(lbl)
		}

		column.append(textContent)

		const DURATION = NOTIF_DURATION
		const progressBar = new Gtk.ProgressBar()
		progressBar.css_classes = ["notif-progress"]
		progressBar.fraction = 1
		column.append(progressBar)

		if (hasImage) {
			const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL })
			const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(image!, NOTIF_IMAGE_SIZE, -1, true)
			const texture = Gdk.Texture.new_for_pixbuf(pixbuf)
			const pic = new Gtk.Picture({ paintable: texture })
			pic.css_classes = ["notif-image"]
			pic.content_fit = Gtk.ContentFit.COVER
			pic.halign = Gtk.Align.FILL
			pic.valign = Gtk.Align.FILL
			pic.width_request = NOTIF_IMAGE_SIZE
			pic.height_request = 1
			row.append(pic)
			row.append(column)
			popup.append(row)
		} else if (appIcon) {
			const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL })
			const img = Gtk.Image.new_from_icon_name(appIcon)
			img.css_classes = ["notif-icon"]
			img.pixel_size = 32
			img.valign = Gtk.Align.CENTER
			row.append(img)
			row.append(column)
			popup.append(row)
		} else {
			popup.append(column)
		}

		listBox.append(popup)
		popups.set(id, popup)

		let startTime = GLib.get_monotonic_time()
		let hovered = false

		const startTimer = () => {
			startTime = GLib.get_monotonic_time()
			progressBar.fraction = 1
			timers.set(id, setTimeout(() => dismiss(id), DURATION))
		}

		const stopTimer = () => {
			const timer = timers.get(id)
			if (timer) clearTimeout(timer)
			timers.delete(id)
		}

		const hover = new Gtk.EventControllerMotion()
		hover.connect("enter", () => { hovered = true; stopTimer(); progressBar.fraction = 1 })
		hover.connect("leave", () => { hovered = false; startTimer() })
		popup.add_controller(hover)

		const src = progressBar.add_tick_callback((_widget: Gtk.Widget, frameClock: any) => {
			if (!hovered) {
				const elapsed = (frameClock.get_frame_time() - startTime) / 1000
				progressBar.fraction = Math.max(0, 1 - elapsed / DURATION)
			}
			return true
		})
		glibSources.set(id, src)
		startTimer()
	}

	notifd.connect("notified", (_: Notifd.Notifd, id: number) => addNotif(id))
	notifd.connect("resolved", (_: Notifd.Notifd, id: number) => remove(id))

	return (
		<window
			visible
			name="notifications"
			class="Notifications"
			gdkmonitor={monitor}
			anchor={CORNER_ANCHOR[NOTIF_CORNER]}
			layer={Astal.Layer.OVERLAY}
			exclusivity={Astal.Exclusivity.NORMAL}
			application={app}
		>
			<box
				orientation={Gtk.Orientation.VERTICAL}
				spacing={8}
				valign={CORNER_VALIGN[NOTIF_CORNER]}
				onRealize={(self: Gtk.Box) => {
					listBox = self
					notifd.get_notifications().forEach((n: Notifd.Notification) => addNotif(n.get_id()))
				}}
			/>
		</window>
	)
}
