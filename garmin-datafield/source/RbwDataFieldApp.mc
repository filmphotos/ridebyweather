import Toybox.Application;
import Toybox.WatchUi;
import Toybox.Lang;

class RbwDataFieldApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() {
        return [ new RbwDataField() ];
    }

    // User changed settings (e.g. server URL) — drop the cached token.
    function onSettingsChanged() as Void {
        Application.Storage.deleteValue("token");
    }
}
