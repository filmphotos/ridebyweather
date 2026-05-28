import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Communications;

// Three display modes:
//   "status"  - a centered message ("Acquiring GPS...", errors)
//   "pairing" - QR code + short code to sign in from the phone
//   "score"   - the ride/heat-risk score in its risk color
class RbwView extends WatchUi.View {

    hidden var _mode = "status";
    hidden var _status = "Loading...";

    hidden var _pairingCode = "";
    hidden var _qrBitmap = null;

    hidden var _score = null;
    hidden var _label = null;
    hidden var _temp = null;
    hidden var _color = Graphics.COLOR_LT_GRAY;

    hidden var _api;

    function initialize() {
        View.initialize();
        _api = new RbwApi(self);
    }

    function onShow() as Void {
        _api.start();
    }

    // Triggered by the delegate (button press / tap): refresh or retry pairing.
    function triggerRefresh() as Void {
        _api.start();
    }

    function setStatus(msg as String) as Void {
        _mode = "status";
        _status = msg;
        WatchUi.requestUpdate();
    }

    function setPairing(code, qrUrl) as Void {
        _mode = "pairing";
        _pairingCode = code;
        _qrBitmap = null;
        WatchUi.requestUpdate();
        if (qrUrl != null) {
            var options = {
                :maxWidth => 150,
                :maxHeight => 150,
                :dithering => Communications.IMAGE_DITHERING_NONE
            };
            Communications.makeImageRequest(qrUrl, null, options, method(:onQrImage));
        }
    }

    function onQrImage(responseCode as Number, data as WatchUi.BitmapResource or Graphics.BitmapReference or Null) as Void {
        if (responseCode == 200 && data != null) {
            _qrBitmap = data;
            WatchUi.requestUpdate();
        }
    }

    function setData(score, label, colorHex, temp) as Void {
        _mode = "score";
        _score = score;
        _label = label;
        _temp = temp;
        _color = parseColor(colorHex);
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;

        if (_mode.equals("pairing")) {
            drawPairing(dc, w, h, cx);
        } else if (_mode.equals("score")) {
            drawScore(dc, cx, h / 2);
        } else {
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h / 2, Graphics.FONT_SMALL, _status,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    hidden function drawPairing(dc as Graphics.Dc, w as Number, h as Number, cx as Number) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, 10, Graphics.FONT_XTINY, "Scan to sign in", Graphics.TEXT_JUSTIFY_CENTER);

        if (_qrBitmap != null) {
            var qw = _qrBitmap.getWidth();
            var qh = _qrBitmap.getHeight();
            dc.drawBitmap(cx - qw / 2, 32, _qrBitmap);
            dc.drawText(cx, 32 + qh + 6, Graphics.FONT_TINY, _pairingCode, Graphics.TEXT_JUSTIFY_CENTER);
        } else {
            dc.drawText(cx, h / 2 - 12, Graphics.FONT_TINY, "Loading QR...",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.drawText(cx, h / 2 + 14, Graphics.FONT_TINY, _pairingCode,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    hidden function drawScore(dc as Graphics.Dc, cx as Number, cy as Number) as Void {
        var scoreStr = "--";
        if (_score != null) {
            scoreStr = _score.toNumber().toString();
        }
        dc.setColor(_color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, cy - 28, Graphics.FONT_NUMBER_MEDIUM, scoreStr,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        if (_label != null) {
            dc.drawText(cx, cy + 22, Graphics.FONT_SMALL, _label,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
        if (_temp != null) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, cy + 48, Graphics.FONT_TINY, _temp.toNumber().toString() + "°F",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    // "#RRGGBB" -> 0xRRGGBB int that Graphics accepts as a color.
    hidden function parseColor(hex) {
        if (hex == null) {
            return Graphics.COLOR_LT_GRAY;
        }
        var s = hex;
        if (s.length() > 0 && s.substring(0, 1).equals("#")) {
            s = s.substring(1, s.length());
        }
        var val = s.toNumberWithBase(16);
        if (val == null) {
            return Graphics.COLOR_LT_GRAY;
        }
        return val;
    }
}
