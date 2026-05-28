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
            _view.setStatus("Acquiring GPS...");
            Position.enableLocationEvents(Position.LOCATION_ONE_SHOT, method(:onPosition));
        }
    }

    function onPosition(info as Position.Info) as Void {
        if (info.position != null) {
            useLocation(info);
        } else {
            _view.setStatus("No GPS fix");
        }
    }

    hidden function useLocation(info) {
        var deg = info.position.toDegrees();
        _lat = deg[0];
        _lng = deg[1];

        var token = Application.Storage.getValue("token");
        if (token == null || (token instanceof String && token.equals(""))) {
            startPairing();
        } else {
            fetchScore(token);
        }
    }

    hidden function fetchScore(token) {
        var params = {
            "lat" => _lat.toString(),
            "lng" => _lng.toString()
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
            var score = data.hasKey("score") ? data["score"] : null;
            var label = data.hasKey("label") ? data["label"] : null;
            var color = data.hasKey("color") ? data["color"] : null;
            var temp = null;
            if (data.hasKey("weather") && data["weather"] != null) {
                var w = data["weather"];
                if (w instanceof Dictionary && w.hasKey("tempF")) {
                    temp = w["tempF"];
                }
            }
            _view.setData(score, label, color, temp);
        } else if (responseCode == 401) {
            // Token expired — clear it and re-pair.
            Application.Storage.deleteValue("token");
            _view.setStatus("Sign-in expired - press to retry");
        } else {
            _view.setStatus("Error " + responseCode);
        }
    }
}
