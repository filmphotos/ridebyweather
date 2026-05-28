import Toybox.WatchUi;
import Toybox.Lang;

// Maps the primary button (watches) and screen taps (Edge/touch) to a refresh.
class RbwDelegate extends WatchUi.BehaviorDelegate {

    hidden var _view;

    function initialize(view) {
        BehaviorDelegate.initialize();
        _view = view;
    }

    function onSelect() as Boolean {
        _view.triggerRefresh();
        return true;
    }

    function onTap(evt as WatchUi.ClickEvent) as Boolean {
        _view.triggerRefresh();
        return true;
    }
}
