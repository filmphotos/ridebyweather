import Toybox.Communications;
import Toybox.Position;
import Toybox.Application;
import Toybox.Lang;
import Toybox.Timer;
import Toybox.PersistedContent;

// Talks to the RideByWeather backend.
// Login uses a device-pairing flow: request a code, show a QR, poll until the
// user approves it on their phone, then store the returned token. After that it
// fetches the ride/heat-risk score for the current GPS location.
class RbwApi {

    hidden var _view;
    hidden var _lat;
    hidden var _lng;
    hidden var _secret;       // device-pairing secret used for polling
    hidden var _pollTimer;
    hidden var _latStr;       // last coordinates sent (for on-screen diagnostics)
    hidden var _lngStr;
    hidden var _pendingPoiType;

    function initialize(view) {
        _view = view;
    }

    // Entry point: pair if we have no token, otherwise load the score.
    function start() {
        var token = Application.Storage.getValue("token");
        if (token == null || (token instanceof String && token.equals(""))) {
            startPairing();
        } else {
            loadScore();
        }
    }

    hidden function baseUrl() {
        var u = Application.Properties.getValue("baseUrl");
        if (u == null || u.equals("")) {
            u = "https://ridebyweather.com";
        }
        return u;
    }

    // ---------- Pairing ----------

    hidden function startPairing() {
        _view.setStatus("Connecting...");
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(baseUrl() + "/api/device/code", { "device" => "edge" }, options, method(:onCode));
    }

    function onCode(responseCode as Number, data as Null or Dictionary or String or PersistedContent.Iterator) as Void {
        if (responseCode == 200 && data instanceof Dictionary && data.hasKey("deviceSecret")) {
            _secret = data["deviceSecret"];
            var code = data.hasKey("code") ? data["code"] : "";
            var qrUrl = data.hasKey("qrUrl") ? data["qrUrl"] : null;
            _view.setPairing(code, qrUrl);
            startPolling();
        } else {
            _view.setStatus("Setup failed (" + responseCode + ")");
        }
    }

    hidden function startPolling() {
        if (_pollTimer == null) {
            _pollTimer = new Timer.Timer();
        }
        _pollTimer.start(method(:poll), 3000, true);
    }

    hidden function stopPolling() {
        if (_pollTimer != null) {
            _pollTimer.stop();
        }
    }

    function poll() as Void {
        if (_secret == null) {
            return;
        }
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(baseUrl() + "/api/device/poll", { "secret" => _secret }, options, method(:onPoll));
    }

    function onPoll(responseCode as Number, data as Null or Dictionary or String or PersistedContent.Iterator) as Void {
        if (responseCode == 200 && data instanceof Dictionary && data.hasKey("status")) {
            var status = data["status"];
            if (status.equals("approved") && data.hasKey("token")) {
                stopPolling();
                Application.Storage.setValue("token", data["token"]);
                _view.setStatus("Signed in!");
                loadScore();
            } else if (status.equals("expired") || status.equals("consumed")) {
                stopPolling();
                _view.setStatus("Code expired - press to retry");
            }
            // "pending": keep polling.
        }
    }

    // ---------- Score ----------

    hidden function loadScore() {
        var info = Position.getInfo();
        if (info != null && info.position != null) {
            useLocation(info);
        } else {
            _view.setStatus("Acquiring GPS - go outside");
            Position.enableLocationEvents(Position.LOCATION_CONTINUOUS, method(:onPosition));
        }
    }

    function onPosition(info as Position.Info) as Void {
        useLocation(info);
    }

    hidden function useLocation(info) {
        if (info == null || info.position == null) {
            _view.setStatus("Acquiring GPS - go outside");
            return;
        }
        var deg = info.position.toDegrees();
        var lat = deg[0];
        var lng = deg[1];

        // Garmin returns 180,180 (pi radians) when there's no real satellite
        // fix. Latitude must be within +/-90, so reject the placeholder and
        // keep listening for a genuine fix instead of sending a bogus 400.
        if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
            _view.setStatus("Waiting for GPS fix - go outside");
            Position.enableLocationEvents(Position.LOCATION_CONTINUOUS, method(:onPosition));
            return;
        }

        _lat = lat;
        _lng = lng;

        var token = Application.Storage.getValue("token");
        if (token == null || (token instanceof String && token.equals(""))) {
            startPairing();
        } else {
            fetchScore(token);
        }
    }

    // Locale-independent "-122.33456" — built from integer parts so no comma
    // separator or float artifact can sneak in.
    hidden function coord(v) {
        var neg = v < 0;
        var a = neg ? -v : v;
        var whole = a.toNumber();
        var frac = ((a - whole) * 100000.0 + 0.5).toNumber();
        if (frac >= 100000) { whole += 1; frac -= 100000; }
        var fracStr = frac.toString();
        while (fracStr.length() < 5) { fracStr = "0" + fracStr; }
        var s = whole.toString() + "." + fracStr;
        return neg ? ("-" + s) : s;
    }

    hidden function fetchScore(token) {
        _latStr = coord(_lat);
        _lngStr = coord(_lng);
        var params = {
            "lat" => _latStr,
            "lng" => _lngStr
        };
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => { "Authorization" => "Bearer " + token },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(baseUrl() + "/api/ride-score", params, options, method(:onScore));
    }

    function onScore(responseCode as Number, data as Null or Dictionary or String or PersistedContent.Iterator) as Void {
        if (responseCode == 200 && data instanceof Dictionary) {
            var out = {};
            out["score"] = data.hasKey("score") ? data["score"] : null;
            out["label"] = data.hasKey("label") ? data["label"] : null;
            out["color"] = data.hasKey("color") ? data["color"] : null;
            if (data.hasKey("weather") && data["weather"] instanceof Dictionary) {
                var w = data["weather"];
                out["tempF"] = w.hasKey("tempF") ? w["tempF"] : null;
                out["feelsLikeF"] = w.hasKey("feelsLikeF") ? w["feelsLikeF"] : null;
                out["windSpeedMph"] = w.hasKey("windSpeedMph") ? w["windSpeedMph"] : null;
                out["windDirDeg"] = w.hasKey("windDirDeg") ? w["windDirDeg"] : null;
                out["humidity"] = w.hasKey("humidity") ? w["humidity"] : null;
                out["precipProb"] = w.hasKey("precipProb") ? w["precipProb"] : null;
                out["condition"] = w.hasKey("condition") ? w["condition"] : null;
            }
            _view.setScore(out);
        } else if (responseCode == 401) {
            // Token expired — clear it and re-pair.
            Application.Storage.deleteValue("token");
            _view.setStatus("Sign-in expired - press to retry");
        } else {
            // Show the coordinates we sent so we can diagnose a 400 directly.
            _view.setStatus2("Err " + responseCode, _latStr + ", " + _lngStr);
        }
    }

    // ---------- Nearby POIs (restrooms / food) ----------

    // type is "restrooms" or "food". Uses the location from the last score fetch.
    function fetchPoi(type) {
        var token = Application.Storage.getValue("token");
        if (token == null || _lat == null || _lng == null) {
            return;
        }
        _pendingPoiType = type;
        var params = {
            "lat" => coord(_lat),
            "lng" => coord(_lng),
            "type" => type
        };
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => { "Authorization" => "Bearer " + token },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(baseUrl() + "/api/poi", params, options, method(:onPoi));
    }

    function onPoi(responseCode as Number, data as Null or Dictionary or String or PersistedContent.Iterator) as Void {
        if (responseCode == 200 && data instanceof Dictionary && data.hasKey("items")) {
            _view.setPoi(_pendingPoiType, data["items"]);
        } else {
            _view.setPoiError(_pendingPoiType, responseCode);
        }
    }
}
