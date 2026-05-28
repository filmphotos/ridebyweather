import Toybox.WatchUi;
import Toybox.Lang;

// Edge button mapping:
//   START  -> start / stop recording the ride
//   UP     -> zoom in (map page) / previous page
//   DOWN   -> zoom out (map page) / next page
//   LAP    -> cycle pages (Score -> Map -> List) — never get stuck on the map
//   BACK   -> exit (default)
class RbwDelegate extends WatchUi.BehaviorDelegate {

    hidden var _view;

    function initialize(view) {
        BehaviorDelegate.initialize();
        _view = view;
    }

    function onKey(evt as WatchUi.KeyEvent) as Boolean {
        var key = evt.getKey();
        if (key == WatchUi.KEY_ENTER) {
            _view.toggleRecording();
            return true;
        } else if (key == WatchUi.KEY_UP) {
            _view.onUp();
            return true;
        } else if (key == WatchUi.KEY_DOWN) {
            _view.onDown();
            return true;
        } else if (key == WatchUi.KEY_LAP) {
            _view.cyclePage();
            return true;
        }
        return false;
    }
}
