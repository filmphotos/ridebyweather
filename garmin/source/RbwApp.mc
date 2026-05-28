import Toybox.Application;
import Toybox.WatchUi;
import Toybox.Lang;

// Connect IQ entry point. Declared as `entry="RbwApp"` in manifest.xml.
class RbwApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
    }

    function onStop(state as Dictionary?) as Void {
    }

    function getInitialView() {
        var view = new RbwView();
        return [ view, new RbwDelegate(view) ];
    }

    // Fired when the user changes settings (email/password/URL) in Garmin
    // Connect. Drop any cached token so the new credentials take effect.
    function onSettingsChanged() as Void {
        Application.Storage.deleteValue("token");
        WatchUi.requestUpdate();
    }
}
