import app from "ags/gtk4/app"
import style from "./style.scss"
import Bar from "./widget/Bar"
import Notifications, { NOTIF_MONITOR } from "./widget/notifications/Notifications"

app.start({
  css: style,
  main() {
    app.get_monitors().map(Bar)
    const monitors = app.get_monitors()
    Notifications(monitors[Math.min(NOTIF_MONITOR, monitors.length - 1)])
  },
})
