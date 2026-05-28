import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Communications;
import Toybox.Timer;
import Toybox.Math;

// Display modes:
//   "status"  - centered message (GPS, errors); optional 2nd line
//   "pairing" - QR code + short code to sign in from the phone
//   "score"   - Garmin-style dashboard: arc gauge + data grid
class RbwView extends WatchUi.View {

    hidden var _mode = "status";
    hidden var _status = "Loading...";
    hidden var _status2 = null;

    hidden var _pairingCode = "";
    hidden var _qrBitmap = null;

    hidden var _data = null;          // Dictionary of score + weather
    hidden var _color = Graphics.COLOR_LT_GRAY;

    // Pages: 0 = score, 1 = map, 2 = nearby list
    hidden var _page = 0;
    hidden var _restrooms = null;
    hidden var _food = null;
    hidden var _restroomsState = "idle";   // idle | loading | ready | error
    hidden var _foodState = "idle";
    hidden var _mapBitmap = null;
    hidden var _mapState = "idle";

    hidden var _api;
    hidden var _refreshTimer;

    function initialize() {
        View.initialize();
        _api = new RbwApi(self);
    }

    function onShow() as Void {
        _api.start();
        // Keep the score fresh as conditions/location change during a ride.
        if (_refreshTimer == null) {
            _refreshTimer = new Timer.Timer();
        }
        _refreshTimer.start(method(:onTick), 120000, true);
    }

    function onHide() as Void {
        if (_refreshTimer != null) {
            _refreshTimer.stop();
        }
    }

    function onTick() as Void {
        if (_mode.equals("score")) {
            _api.start();
        }
    }

    function triggerRefresh() as Void {
        _api.start();
    }

    function setStatus(msg as String) as Void {
        _mode = "status";
        _status = msg;
        _status2 = null;
        WatchUi.requestUpdate();
    }

    function setStatus2(line1, line2) as Void {
        _mode = "status";
        _status = line1;
        _status2 = line2;
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

    function setScore(d) as Void {
        _mode = "score";
        _data = d;
        _color = parseColor(d.hasKey("color") ? d["color"] : null);
        WatchUi.requestUpdate();
    }

    function setPoi(type, items) as Void {
        if (type.equals("food")) {
            _food = items;
            _foodState = "ready";
        } else {
            _restrooms = items;
            _restroomsState = "ready";
        }
        WatchUi.requestUpdate();
    }

    function setPoiError(type, code) as Void {
        if (type.equals("food")) {
            _foodState = "error";
        } else {
            _restroomsState = "error";
        }
        WatchUi.requestUpdate();
    }

    // Called by the delegate's up/down buttons.
    function nextPage() as Void {
        if (!_mode.equals("score")) { return; }
        _page = (_page + 1) % 3;
        onPageEnter();
        WatchUi.requestUpdate();
    }

    function prevPage() as Void {
        if (!_mode.equals("score")) { return; }
        _page = (_page + 2) % 3;
        onPageEnter();
        WatchUi.requestUpdate();
    }

    hidden function onPageEnter() as Void {
        if (_page == 1 && _mapState.equals("idle")) {
            _mapState = "loading";
            _api.fetchMap();
        } else if (_page == 2) {
            if (_restroomsState.equals("idle")) {
                _restroomsState = "loading";
                _api.fetchRestrooms();
            }
            if (_foodState.equals("idle")) {
                _foodState = "loading";
                _api.fetchFood();
            }
        }
    }

    // Called by the Api with the /api/map URL; downloads the PNG.
    function loadMap(url) as Void {
        _mapState = "loading";
        WatchUi.requestUpdate();
        var options = {
            :maxWidth => 240,
            :maxHeight => 240,
            :dithering => Communications.IMAGE_DITHERING_NONE
        };
        Communications.makeImageRequest(url, null, options, method(:onMapImage));
    }

    function onMapImage(responseCode as Number, data as WatchUi.BitmapResource or Graphics.BitmapReference or Null) as Void {
        if (responseCode == 200 && data != null) {
            _mapBitmap = data;
            _mapState = "ready";
        } else {
            _mapState = "error";
        }
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
            if (_page == 1) {
                drawMapPage(dc, w, h);
            } else if (_page == 2) {
                drawListPage(dc, w, h);
            } else {
                drawDashboard(dc, w, h);
            }
            drawPageIndicator(dc, w, h);
        } else {
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            var y1 = (_status2 == null) ? (h / 2) : (h * 0.42);
            dc.drawText(cx, y1, Graphics.FONT_SMALL, _status,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            if (_status2 != null) {
                dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
                dc.drawText(cx, h * 0.55, Graphics.FONT_XTINY, _status2,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            }
        }
    }

    // ---------- Score dashboard ----------

    hidden function drawDashboard(dc as Graphics.Dc, w as Number, h as Number) as Void {
        var cx = w / 2;

        // Header band in the risk color with the label (GOOD / TOUGH / etc.).
        var headerH = (h * 0.11).toNumber();
        dc.setColor(_color, _color);
        dc.fillRectangle(0, 0, w, headerH);
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
        var label = gvStr("label", "RIDE SCORE");
        dc.drawText(cx, headerH / 2, Graphics.FONT_TINY, label,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Arc gauge: 270 degree sweep, filled proportional to score/10.
        var gcy = (h * 0.36).toNumber();
        var radius = ((w < h ? w : h) * 0.26).toNumber();
        var pen = (radius * 0.18).toNumber();
        if (pen < 6) { pen = 6; }
        dc.setPenWidth(pen);

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawArc(cx, gcy, radius, Graphics.ARC_CLOCKWISE, 225, 315);

        var score = gvNum("score");
        if (score != null && score > 0) {
            var sweep = (score / 10.0) * 270.0;
            var endA = 225.0 - sweep;
            while (endA < 0) { endA += 360.0; }
            dc.setColor(_color, Graphics.COLOR_TRANSPARENT);
            dc.drawArc(cx, gcy, radius, Graphics.ARC_CLOCKWISE, 225, endA.toNumber());
        }
        dc.setPenWidth(1);

        // Score number + "out of 10" inside the gauge.
        var scoreStr = (score == null) ? "--" : score.format("%.1f");
        dc.setColor(_color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, gcy - 4, Graphics.FONT_NUMBER_MILD, scoreStr,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, gcy + (radius * 0.42).toNumber(), Graphics.FONT_XTINY, "out of 10",
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // 2x2 data grid.
        var colL = (w * 0.27).toNumber();
        var colR = (w * 0.73).toNumber();
        var row1 = (h * 0.61).toNumber();
        var row2 = (h * 0.80).toNumber();

        drawCell(dc, colL, row1, "TEMP", tempStr("tempF"));
        drawCell(dc, colR, row1, "WIND", windStr());
        drawCell(dc, colL, row2, "FEELS", tempStr("feelsLikeF"));
        drawCell(dc, colR, row2, "HUM", pctStr("humidity"));

        // Small wind-direction arrow next to the WIND cell.
        var wdir = gvNum("windDirDeg");
        if (wdir != null) {
            drawArrow(dc, (w * 0.92).toNumber(), row1 + (h * 0.045).toNumber(),
                (h * 0.028).toNumber(), wdir);
        }

        // Conditions / precip footer.
        var cond = gvStr("condition", "");
        var precip = gvNum("precipProb");
        var footer = cond;
        if (precip != null) {
            if (!footer.equals("")) { footer += "  "; }
            footer += precip.toNumber().toString() + "% rain";
        }
        if (!footer.equals("")) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 0.93, Graphics.FONT_XTINY, footer,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    hidden function drawCell(dc as Graphics.Dc, x as Number, y as Number, label as String, value as String) as Void {
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, Graphics.FONT_XTINY, label, Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y + 16, Graphics.FONT_SMALL, value, Graphics.TEXT_JUSTIFY_CENTER);
    }

    // Filled triangle pointing toward where the wind is blowing.
    hidden function drawArrow(dc as Graphics.Dc, cx as Number, cy as Number, size as Number, dirDeg) as Void {
        var ang = (dirDeg + 180.0) * Math.PI / 180.0; // direction wind blows toward
        var tipx = cx + size * Math.sin(ang);
        var tipy = cy - size * Math.cos(ang);
        var a2 = ang + 2.443; // +140 degrees
        var a3 = ang - 2.443; // -140 degrees
        var blx = cx + size * Math.sin(a2);
        var bly = cy - size * Math.cos(a2);
        var brx = cx + size * Math.sin(a3);
        var bry = cy - size * Math.cos(a3);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon([
            [tipx.toNumber(), tipy.toNumber()],
            [blx.toNumber(), bly.toNumber()],
            [brx.toNumber(), bry.toNumber()]
        ]);
    }

    // ---------- Map page (Mapbox static image) ----------

    hidden function drawMapPage(dc as Graphics.Dc, w as Number, h as Number) as Void {
        var cx = w / 2;
        var headerH = (h * 0.10).toNumber();
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_DK_GRAY);
        dc.fillRectangle(0, 0, w, headerH);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, headerH / 2, Graphics.FONT_TINY, "NEARBY MAP",
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        if (_mapState.equals("ready") && _mapBitmap != null) {
            var bw = _mapBitmap.getWidth();
            var bh = _mapBitmap.getHeight();
            dc.drawBitmap(cx - bw / 2, headerH + 4, _mapBitmap);

            // Legend.
            var ly = headerH + 8 + bh + 8;
            dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle((w * 0.16).toNumber(), ly, 4);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText((w * 0.21).toNumber(), ly, Graphics.FONT_XTINY, "Restroom",
                Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle((w * 0.62).toNumber(), ly, 4);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText((w * 0.67).toNumber(), ly, Graphics.FONT_XTINY, "Food",
                Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        } else if (_mapState.equals("error")) {
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h / 2, Graphics.FONT_SMALL, "Map unavailable",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        } else {
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h / 2, Graphics.FONT_SMALL, "Loading map...",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    // ---------- Nearby list page ----------

    hidden function drawListPage(dc as Graphics.Dc, w as Number, h as Number) as Void {
        var cx = w / 2;
        var headerH = (h * 0.10).toNumber();
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_DK_GRAY);
        dc.fillRectangle(0, 0, w, headerH);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, headerH / 2, Graphics.FONT_TINY, "NEARBY",
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        var y = headerH + 14;
        y = drawPoiRows(dc, w, y, _restrooms, _restroomsState, Graphics.COLOR_BLUE, 3);
        y = drawPoiRows(dc, w, y, _food, _foodState, Graphics.COLOR_ORANGE, 3);
    }

    hidden function drawPoiRows(dc as Graphics.Dc, w as Number, y as Number, items, state, dotColor, maxRows as Number) {
        if (state.equals("loading")) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, y, Graphics.FONT_XTINY, "Loading...", Graphics.TEXT_JUSTIFY_CENTER);
            return y + 24;
        }
        if (items == null) { return y; }
        var n = items.size();
        if (n > maxRows) { n = maxRows; }
        for (var i = 0; i < n; i++) {
            var it = items[i];
            var name = poiStr(it, "name", "?");
            if (name.length() > 14) { name = name.substring(0, 13) + "."; }
            var d = poiNum(it, "distanceMi");
            var dStr = (d == null) ? "" : d.format("%.1f") + "mi";
            var dir = compass(poiNum(it, "bearingDeg"));
            dc.setColor(dotColor, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle((w * 0.09).toNumber(), y, 4);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText((w * 0.16).toNumber(), y, Graphics.FONT_XTINY,
                name + "  " + dStr + " " + dir,
                Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
            y += 24;
        }
        if (n == 0 && state.equals("ready")) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, y, Graphics.FONT_XTINY, "None nearby", Graphics.TEXT_JUSTIFY_CENTER);
            y += 24;
        }
        return y;
    }

    hidden function drawPageIndicator(dc as Graphics.Dc, w as Number, h as Number) as Void {
        var cx = w / 2;
        var y = (h * 0.965).toNumber();
        var gap = 12;
        var startX = cx - gap;
        for (var i = 0; i < 3; i++) {
            if (i == _page) {
                dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(startX + i * gap, y, 3);
            } else {
                dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(startX + i * gap, y, 2);
            }
        }
    }

    hidden function poiNum(it, key) {
        if (it == null || !(it instanceof Dictionary) || !it.hasKey(key) || it[key] == null) {
            return null;
        }
        return it[key];
    }

    hidden function poiStr(it, key, fallback) {
        if (it == null || !(it instanceof Dictionary) || !it.hasKey(key) || it[key] == null) {
            return fallback;
        }
        return it[key];
    }

    // ---------- Pairing ----------

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

    // ---------- Helpers ----------

    hidden function gvNum(key) {
        if (_data == null || !_data.hasKey(key) || _data[key] == null) {
            return null;
        }
        return _data[key];
    }

    hidden function gvStr(key, fallback) {
        if (_data == null || !_data.hasKey(key) || _data[key] == null) {
            return fallback;
        }
        return _data[key];
    }

    hidden function tempStr(key) {
        var v = gvNum(key);
        return (v == null) ? "--" : v.toNumber().toString() + "°";
    }

    hidden function pctStr(key) {
        var v = gvNum(key);
        return (v == null) ? "--" : v.toNumber().toString() + "%";
    }

    hidden function windStr() {
        var v = gvNum("windSpeedMph");
        var dir = compass(gvNum("windDirDeg"));
        if (v == null) { return "--"; }
        var s = v.toNumber().toString();
        if (!dir.equals("")) { s += " " + dir; }
        return s;
    }

    hidden function compass(deg) {
        if (deg == null) { return ""; }
        var d = deg.toNumber();              // integer degrees
        var n = ((d % 360) + 360) % 360;     // normalize 0..359
        var idx = ((n + 22) / 45) % 8;       // nearest of 8 points
        var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        return dirs[idx];
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
