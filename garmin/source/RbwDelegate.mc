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

    // Up/Down buttons on the Edge page between Score / Restrooms / Food.
    function onNextPage() as Boolean {
        _view.nextPage();
        return true;
    }

    function onPreviousPage() as Boolean {
        _view.prevPage();
        return true;
    }
}
