import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Communications;
import Toybox.Application;
import Toybox.Activity;
import Toybox.PersistedContent;

// Connect IQ data field: shows the RideByWeather ride/heat-risk score inside a
// normal Garmin activity data screen. compute() is the ~1 Hz heartbeat; we use
// it to capture location and throttle network calls. Pairs with its own short
// code (it can't share the device app's token).
class RbwDataField extends WatchUi.DataField {

    hidden var _score = null;
    hidden var _label = null;
    hidden var _color = Graphics.COLOR_LT_GRAY;

    hidden var _lat = null;
    hidden var _lng = null;

    hidden var _tick = 0;
    hidden var _lastFetchTick = -1000;

    hidden var _token = null;
    hidden var _secret = null;
    hidden var _code = null;
    hidden var _msg = "Starting...";

    function initialize() {
        DataField.initialize();
        _token = Application.Storage.getValue("token");
    }

    function compute(info as Activity.Info) as Void {
        _tick += 1;

        if (info != null && info.currentLocation != null) {
            var d = info.currentLocation.toDegrees();
            _lat = d[0];
            _lng = d[1];
        }

        if (_token == null) {
            doPairing();
        } else if (_lat != null && (_tick - _lastFetchTick) >= 120) {
            _lastFetchTick = _tick;
            fetchScore();
        }
    }

    hidden function baseUrl() {
        var u = Application.Properties.getValue("baseUrl");
        if (u == null || u.equals("")) { u = "https://ridebyweather.com"; }
        return u;
    }

    // ---- Pairing (own short code, since data fields can't share storage) ----

    hidden function doPairing() {
        if (_secret == null) {
            if (!_msg.equals("Requesting")) {
                _msg = "Requesting";
                var options = {
                    :method => Communications.HTTP_REQUEST_METHOD_POST,
                    :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON },
                    :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
                };
                Communications.makeWebRequest(baseUrl() + "/api/device/code",
                    { "device" => "edge-field" }, options, method(:onCode));
            }
        } else if ((_tick % 3) == 0) {
            var options = {
                :method => Communications.HTTP_REQUEST_METHOD_GET,
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
            };
            Communications.makeWebRequest(baseUrl() + "/api/device/poll",
                { "secret" => _secret }, options, method(:onPoll));
        }
    }

    function onCode(code as Number, data as Null or Dictionary or String or PersistedContent.Iterator) as Void {
        if (code == 200 && data instanceof Dictionary && data.hasKey("deviceSecret")) {
            _secret = data["deviceSecret"];
            _code = data["code"];
        } else {
            _msg = "Setup " + code;
        }
    }

    function onPoll(code as Number, data as Null or Dictionary or String or PersistedContent.Iterator) as Void {
        if (code == 200 && data instanceof Dictionary && data.hasKey("status")) {
            var st = data["status"];
            if (st.equals("approved") && data.hasKey("token")) {
                _token = data["token"];
                Application.Storage.setValue("token", _token);
            } else if (st.equals("expired") || st.equals("consumed")) {
                _secret = null;
                _code = null;
                _msg = "Starting...";
            }
        }
    }

    // ---- Score ----

    hidden function fetchScore() {
        var params = {
            "lat" => _lat.format("%.5f"),
            "lng" => _lng.format("%.5f")
        };
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => { "Authorization" => "Bearer " + _token },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(baseUrl() + "/api/ride-score", params, options, method(:onScore));
    }

    function onScore(code as Number, data as Null or Dictionary or String or PersistedContent.Iterator) as Void {
        if (code == 200 && data instanceof Dictionary) {
            _score = data.hasKey("score") ? data["score"] : null;
            _label = data.hasKey("label") ? data["label"] : null;
            _color = parseColor(data.hasKey("color") ? data["color"] : null);
        } else if (code == 401) {
            Application.Storage.deleteValue("token");
            _token = null;
            _secret = null;
        }
    }

    // ---- Draw ----

    function onUpdate(dc as Graphics.Dc) as Void {
        var bg = getBackgroundColor();
        var fg = (bg == Graphics.COLOR_BLACK) ? Graphics.COLOR_WHITE : Graphics.COLOR_BLACK;
        dc.setColor(bg, bg);
        dc.clear();

        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var cy = h / 2;

        if (_token == null) {
            dc.setColor(fg, Graphics.COLOR_TRANSPARENT);
            var pairMsg = (_code == null) ? _msg : ("PAIR " + _code);
            dc.drawText(cx, cy, Graphics.FONT_XTINY, pairMsg,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }

        var scoreStr = (_score == null) ? "--" : _score.format("%.1f");
        dc.setColor((_score == null) ? fg : _color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, cy - (h * 0.12).toNumber(), pickNumberFont(h), scoreStr,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        if (_label != null) {
            dc.setColor(fg, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, cy + (h * 0.28).toNumber(), Graphics.FONT_XTINY, _label,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    // Pick a number font that fits the (variable) field height.
    hidden function pickNumberFont(h as Number) {
        if (h >= 120) { return Graphics.FONT_NUMBER_MEDIUM; }
        if (h >= 80) { return Graphics.FONT_NUMBER_MILD; }
        return Graphics.FONT_NUMBER_MILD;
    }

    hidden function parseColor(hex) {
        if (hex == null) { return Graphics.COLOR_LT_GRAY; }
        var s = hex;
        if (s.length() > 0 && s.substring(0, 1).equals("#")) {
            s = s.substring(1, s.length());
        }
        var val = s.toNumberWithBase(16);
        if (val == null) { return Graphics.COLOR_LT_GRAY; }
        return val;
    }
}
