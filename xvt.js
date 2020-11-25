"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const spawn = require('child_process');
const class_validator_1 = require("class-validator");
var xvt;
(function (xvt) {
    xvt.reset = 0;
    xvt.bright = 1;
    xvt.faint = 2;
    xvt.uline = 4;
    xvt.blink = 5;
    xvt.reverse = 7;
    xvt.off = 20;
    xvt.nobright = 21;
    xvt.normal = 22;
    xvt.nouline = 24;
    xvt.noblink = 25;
    xvt.noreverse = 27;
    xvt.black = 30;
    xvt.red = 31;
    xvt.green = 32;
    xvt.yellow = 33;
    xvt.blue = 34;
    xvt.magenta = 35;
    xvt.cyan = 36;
    xvt.white = 37;
    xvt.Black = 40;
    xvt.Red = 41;
    xvt.Green = 42;
    xvt.Yellow = 43;
    xvt.Blue = 44;
    xvt.Magenta = 45;
    xvt.Cyan = 46;
    xvt.White = 47;
    xvt.lblack = 90;
    xvt.lred = 91;
    xvt.lgreen = 92;
    xvt.lyellow = 93;
    xvt.lblue = 94;
    xvt.lmagenta = 95;
    xvt.lcyan = 96;
    xvt.lwhite = 97;
    xvt.lBlack = 100;
    xvt.lRed = 101;
    xvt.lGreen = 102;
    xvt.lYellow = 103;
    xvt.lBlue = 104;
    xvt.lMagenta = 105;
    xvt.lCyan = 106;
    xvt.lWhite = 107;
    xvt.cll = 254;
    xvt.clear = 255;
    xvt.carrier = false;
    xvt.modem = false;
    xvt.reason = '';
    xvt.defaultColor = xvt.white;
    xvt.defaultTimeout = 0;
    xvt.defaultWarn = true;
    xvt.entry = '';
    xvt.idleTimeout = 0;
    xvt.sessionAllowed = 0;
    xvt.sessionStart = null;
    xvt.terminator = null;
    xvt.typeahead = '';
    function hangup() {
        if (xvt.ondrop)
            xvt.ondrop();
        xvt.ondrop = null;
        if (xvt.carrier && xvt.modem) {
            out(xvt.off, '+', -50, '+', -50, '+', -400);
            outln('\nOK');
            out(-300, 'ATH\r', -200);
            beep();
            outln('\n', -100, 'NO CARRIER');
        }
        xvt.carrier = false;
        process.exit();
    }
    xvt.hangup = hangup;
    function sleep(ms) {
        if (xvt.carrier)
            spawn.execSync(`sleep ${ms / 1000}`);
    }
    xvt.sleep = sleep;
    class session {
        constructor(e = 'XT') {
            xvt.carrier = true;
            if (process.stdin.isTTY)
                process.stdin.setRawMode(true);
            this.emulation = e;
            xvt.sessionStart = new Date();
        }
        get emulation() {
            return this._emulation;
        }
        set emulation(e) {
            this._encoding = e == 'XT' ? 'utf8' : 'ascii';
            process.stdin.setEncoding(this.encoding);
            process.stdout.setEncoding(this.encoding);
            this._emulation = e;
        }
        get encoding() {
            return this._encoding;
        }
        get LGradient() {
            return {
                VT: '\x1B(0\x1B[2ma\x1B[ma\x1B[7m \x1B[1m \x1B[27m\x1B(B',
                PC: '\xB0\xB1\xB2\xDB',
                XT: '\u2591\u2592\u2593\u2588',
                dumb: ' :: '
            }[this._emulation];
        }
        get RGradient() {
            return {
                VT: '\x1B(0\x1B[1;7m \x1B[22m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
                PC: '\xDB\xB2\xB1\xB0',
                XT: '\u2588\u2593\u2592\u2591',
                dumb: ' :: '
            }[this._emulation];
        }
        get Draw() {
            return {
                VT: ['q', 'm', 'v', 'j', 't', 'n', 'u', 'l', 'w', 'k', 'x'],
                PC: ['\xC4', '\xC0', '\xC1', '\xD9', '\xC3', '\xC5', '\xB4', '\xDA', '\xC2', '\xBF', '\xB3'],
                XT: ['\u2500', '\u2514', '\u2534', '\u2518', '\u251C', '\u253C', '\u2524', '\u250C', '\u252C', '\u2510', '\u2502'],
                dumb: ['-', '+', '^', '+', '>', '+', '<', '+', 'v', '+', '|']
            }[this._emulation];
        }
        get Empty() {
            return {
                VT: '\x1B(0\x7E\x1B(B',
                PC: '\xFA',
                XT: '\u00B7',
                dumb: '.'
            }[this._emulation];
        }
        get form() {
            return this._fields;
        }
        set form(name) {
            this._fields = name;
        }
        get focus() {
            return this._focus;
        }
        set focus(name) {
            let p = this._fields[name];
            if (!class_validator_1.isDefined(p)) {
                beep();
                outln(xvt.off, xvt.red, '?', xvt.bright, 'ERROR', xvt.defaultColor, ` in xvt.app.form :: field '${name}' undefined`);
                this.refocus();
                return;
            }
            this._focus = name;
            this._read();
        }
        nofocus(keep = false) {
            echo = keep;
            entryMin = 0;
            entryMax = 0;
            eol = false;
            this._focus = null;
        }
        refocus(prompt) {
            if (class_validator_1.isDefined(prompt))
                this._fields[this.focus].prompt = prompt;
            if (class_validator_1.isNotEmpty(this._focus))
                this.focus = this.focus;
        }
        _read() {
            return __awaiter(this, void 0, void 0, function* () {
                let p = this._fields[this.focus];
                cancel = class_validator_1.isDefined(p.cancel) ? p.cancel : '';
                enter = class_validator_1.isDefined(p.enter) ? p.enter : '';
                if (p.enq) {
                    enq = true;
                    warn = false;
                    out(p.prompt);
                    xvt.idleTimeout = 5;
                    yield read();
                    enq = false;
                    p.cb();
                    return;
                }
                out(xvt.reset);
                let row = class_validator_1.isDefined(p.row) ? p.row : 0;
                let col = class_validator_1.isDefined(p.col) ? p.col : 0;
                if (row && col)
                    plot(row, col);
                else
                    outln();
                if (p.pause) {
                    cancel = ' ';
                    echo = false;
                    eol = false;
                    enter = ' ';
                    if (!class_validator_1.isDefined(p.prompt))
                        p.prompt = '-pause-';
                    out('\r', xvt.reverse, p.prompt, xvt.reset);
                    abort = true;
                }
                else {
                    echo = class_validator_1.isDefined(p.echo) ? p.echo : true;
                    eol = class_validator_1.isDefined(p.eol) ? p.eol : true;
                    if (!class_validator_1.isDefined(p.promptStyle))
                        p.promptStyle = defaultPromptStyle;
                    out(...p.promptStyle);
                    if (class_validator_1.isDefined(p.prompt))
                        out(p.prompt);
                    lines = class_validator_1.isDefined(p.lines) ? p.lines : 0;
                    if (lines) {
                        line = 0;
                        outln();
                        out(xvt.bright, (line + 1).toString(), xvt.normal, '/', lines.toString(), xvt.faint, '] ', xvt.normal);
                        multi = [];
                    }
                    if (!class_validator_1.isDefined(p.inputStyle))
                        p.inputStyle = defaultInputStyle;
                    out(...p.inputStyle);
                }
                entryMin = class_validator_1.isDefined(p.min) ? p.min : 0;
                entryMax = class_validator_1.isDefined(p.max) ? p.max : (lines ? 72 : eol ? 0 : 1);
                eraser = class_validator_1.isDefined(p.eraser) ? p.eraser : ' ';
                xvt.idleTimeout = class_validator_1.isDefined(p.timeout) ? p.timeout : xvt.defaultTimeout;
                warn = class_validator_1.isDefined(p.warn) ? p.warn : xvt.defaultWarn;
                if (row && col && echo && entryMax)
                    out(eraser.repeat(entryMax), '\b'.repeat(entryMax));
                yield read();
                out(xvt.reset);
                if (class_validator_1.isDefined(p.match)) {
                    if (!p.match.test(xvt.entry)) {
                        abort = true;
                        this.refocus();
                        return;
                    }
                }
                while (lines && line < lines) {
                    outln();
                    if (xvt.entry.length)
                        multi[line++] = xvt.entry;
                    if (xvt.entry.length && line < lines) {
                        out(xvt.bright, (line + 1).toString(), xvt.normal, '/', lines.toString(), xvt.faint, '] ', xvt.normal);
                        out(...p.inputStyle);
                        yield read();
                        out(xvt.reset);
                    }
                    else {
                        xvt.entry = multi.join('\n');
                        lines = 0;
                    }
                }
                if (class_validator_1.isBoolean(p.pause)) {
                    echo = true;
                    out('\r', xvt.cll);
                }
                p.cb();
            });
        }
    }
    xvt.session = session;
    xvt.col = 0;
    xvt.row = 0;
    let _col = 0;
    let _color = 0;
    let _bold = false;
    let _dim = false;
    let _ul = false;
    let _flash = false;
    let _row = 0;
    let _rvs = false;
    let _SGR = '';
    let _text = '';
    function attr(...params) {
        let result = '';
        params.forEach(data => {
            if (typeof data == 'number') {
                if (data < 0) {
                    text();
                    result = _text;
                    _text = '';
                    out(result);
                    sleep(-data);
                }
                else if (xvt.app.emulation !== 'dumb') {
                    switch (data) {
                        case xvt.cll:
                            text('\x1B[K');
                            break;
                        case xvt.clear:
                            text('\x1B[H\x1B[J');
                            xvt.row = 1;
                            xvt.col = 1;
                            break;
                        case xvt.off:
                            xvt.color = xvt.defaultColor;
                        case xvt.reset:
                            if (xvt.color || xvt.bold || xvt.dim || xvt.ul || xvt.flash || xvt.rvs) {
                                _SGR = '';
                                text('\x1B[m');
                            }
                            xvt.color = 0;
                            xvt.bold = false;
                            xvt.dim = false;
                            xvt.ul = false;
                            xvt.flash = false;
                            xvt.rvs = false;
                            break;
                        case xvt.bright:
                            if (xvt.dim) {
                                SGR(xvt.normal.toString());
                                xvt.bold = false;
                                xvt.dim = false;
                            }
                            if (!xvt.bold) {
                                SGR(xvt.bright.toString());
                                if (!xvt.color) {
                                    xvt.color = xvt.defaultColor;
                                    SGR(xvt.color.toString());
                                }
                            }
                            xvt.bold = true;
                            break;
                        case xvt.faint:
                            if (xvt.bold) {
                                SGR(xvt.normal.toString());
                                xvt.bold = false;
                                xvt.dim = false;
                            }
                            if (!xvt.dim)
                                SGR(xvt.faint.toString());
                            xvt.dim = true;
                            break;
                        case xvt.nobright:
                            if (xvt.bold)
                                SGR(xvt.nobright.toString());
                            xvt.bold = false;
                            break;
                        case xvt.normal:
                            if (xvt.bold || xvt.dim) {
                                SGR(xvt.normal.toString());
                                xvt.bold = false;
                                xvt.dim = false;
                            }
                            break;
                        case xvt.uline:
                            if (!xvt.ul)
                                SGR(xvt.uline.toString());
                            xvt.ul = true;
                            break;
                        case xvt.nouline:
                            if (xvt.ul)
                                SGR(xvt.nouline.toString());
                            xvt.ul = false;
                            break;
                        case xvt.blink:
                            if (!xvt.flash)
                                SGR(xvt.blink.toString());
                            xvt.flash = true;
                            break;
                        case xvt.noblink:
                            if (xvt.flash)
                                SGR(xvt.noblink.toString());
                            xvt.flash = false;
                            break;
                        case xvt.reverse:
                            if (!xvt.rvs)
                                SGR(xvt.reverse.toString());
                            xvt.rvs = true;
                            break;
                        case xvt.noreverse:
                            if (xvt.rvs)
                                SGR(xvt.noreverse.toString());
                            xvt.rvs = false;
                            break;
                        default:
                            xvt.color = data;
                            if (data >= xvt.black && data <= xvt.white || data >= xvt.lblack && data <= xvt.lwhite)
                                if (xvt.app.emulation !== 'VT')
                                    SGR(data.toString());
                            if (data >= xvt.Black && data <= xvt.White || data >= xvt.lBlack && data <= xvt.lWhite) {
                                if (xvt.app.emulation !== 'VT')
                                    SGR(data.toString());
                                else {
                                    if (!xvt.rvs)
                                        SGR(xvt.reverse.toString());
                                    xvt.rvs = true;
                                }
                            }
                            break;
                    }
                }
                else if (data == xvt.clear) {
                    text('\f');
                    xvt.row = 1;
                    xvt.col = 1;
                }
            }
            else {
                text(data);
                let lines = class_validator_1.isString(data) ? data.split('\n') : [];
                if (lines.length > 1) {
                    xvt.row += lines.length - 1;
                    xvt.col = lines[lines.length - 1].length + 1;
                }
            }
        });
        text();
        result = _text;
        _text = '';
        return result;
    }
    xvt.attr = attr;
    function beep() {
        out('\x07');
    }
    xvt.beep = beep;
    function drain() {
        abort = true;
    }
    xvt.drain = drain;
    function out(...params) {
        try {
            if (xvt.carrier)
                process.stdout.write(attr(...params), xvt.app.encoding);
        }
        catch (err) {
            xvt.carrier = false;
        }
    }
    xvt.out = out;
    function outln(...params) {
        out(attr(...params), xvt.reset, '\n');
    }
    xvt.outln = outln;
    function restore() {
        out(xvt.app.emulation == 'VT' ? '\x1B8' : '\x1B[u');
        xvt.col = _col;
        xvt.color = _color;
        xvt.bold = _bold;
        xvt.dim = _dim;
        xvt.ul = _ul;
        xvt.flash = _flash;
        xvt.row = _row;
        xvt.rvs = _rvs;
    }
    xvt.restore = restore;
    function save() {
        out(xvt.app.emulation == 'VT' ? '\x1B7' : '\x1B[s');
        _col = xvt.col;
        _color = xvt.color;
        _bold = xvt.bold;
        _dim = xvt.dim;
        _ul = xvt.ul;
        _flash = xvt.flash;
        _row = xvt.row;
        _rvs = xvt.rvs;
    }
    xvt.save = save;
    function SGR(attr) {
        if (xvt.app.emulation !== 'dumb') {
            if (_SGR == '')
                _SGR = '\x1B[';
            else
                attr = ';' + attr;
            _SGR += attr;
        }
    }
    function text(s = '') {
        if (_SGR.length) {
            _text += _SGR + 'm';
            _SGR = '';
        }
        _text += s;
        xvt.col += s.length;
    }
    function plot(row, col) {
        out('\x1B[', row.toString(), ';', col.toString(), 'H');
        xvt.row = row;
        xvt.col = col;
    }
    xvt.plot = plot;
    function rubout(n = 1) {
        if (echo) {
            out(`\b${eraser}\b`.repeat(n));
            xvt.col -= n;
        }
    }
    xvt.rubout = rubout;
    let abort = false;
    let cancel = '';
    let defaultInputStyle = [xvt.bright, xvt.white];
    let defaultPromptStyle = [xvt.cyan];
    let echo = true;
    let enq = false;
    let enter = '';
    let entryMin = 0;
    let entryMax = 0;
    let eol = true;
    let eraser = ' ';
    let input = '';
    let line = 0;
    let lines = 0;
    let multi;
    let warn = xvt.defaultWarn;
    function read() {
        return __awaiter(this, void 0, void 0, function* () {
            let elapsed = new Date().getTime() / 1000 >> 0;
            let retry = true;
            xvt.entry = '';
            xvt.terminator = null;
            try {
                while (xvt.carrier && retry && class_validator_1.isEmpty(xvt.terminator)) {
                    yield forInput(xvt.idleTimeout ? xvt.idleTimeout * (warn ? 500 : 1000) : 2147483647).catch(() => {
                        elapsed = new Date().getTime() / 1000 >> 0;
                        if (class_validator_1.isEmpty(xvt.terminator) && retry && warn) {
                            beep();
                            retry = warn;
                            warn = false;
                        }
                        else if (xvt.sessionAllowed && (elapsed - (xvt.sessionStart.getTime() / 1000)) > xvt.sessionAllowed)
                            xvt.carrier = false;
                        else
                            retry = false;
                    });
                }
            }
            catch (err) {
                xvt.carrier = false;
                xvt.reason = `read() ${err.message}`;
            }
            if (!xvt.carrier || !retry) {
                if (cancel.length)
                    xvt.terminator = '\x1B';
                else {
                    if (!xvt.carrier) {
                        process.stdout.write(attr(xvt.off, ' ** ', xvt.bright, 'your session expired', xvt.off, ' ** \r'));
                        xvt.reason = xvt.reason || 'got exhausted';
                    }
                    else if (!retry) {
                        outln(xvt.off, ' ** ', xvt.faint, 'timeout', xvt.off, ' ** \r');
                        xvt.reason = xvt.reason || 'fallen asleep';
                    }
                    beep();
                    hangup();
                }
            }
            if (cancel.length && xvt.terminator == '\x1B') {
                rubout(input.length);
                xvt.entry = cancel;
                out(xvt.entry);
                xvt.terminator = '\r';
            }
            echo = true;
            eol = true;
            input = '';
            function forInput(ms) {
                return new Promise((resolve, reject) => {
                    xvt.waiting = () => { resolve(xvt.terminator); };
                    if (process.stdin.isPaused)
                        process.stdin.resume();
                    setTimeout(reject, xvt.carrier ? ms : 0);
                }).finally(() => { xvt.waiting = null; });
            }
        });
    }
    xvt.read = read;
    process.stdin.on('data', (key) => {
        let k;
        let k0;
        try {
            k = xvt.typeahead + key.toString();
            k0 = k.substr(0, 1);
            xvt.typeahead = '';
        }
        catch (err) {
            console.log('stdin', err.name, ':', err.message);
            console.log(k, k.split('').map((c) => { return c.charCodeAt(0); }));
            return;
        }
        if (enq) {
            xvt.entry = k;
            xvt.terminator = k0;
            console.log('enq terminated');
            process.stdin.pause();
            return;
        }
        if (k0 == '\x04' || k0 == '\x1A') {
            outln(xvt.off, ' ** disconnect ** ');
            xvt.reason = 'manual disconnect';
            hangup();
        }
        if (k0 == '\b' || k0 == '\x7F') {
            if (eol && input.length > 0) {
                input = input.substr(0, input.length - 1);
                rubout();
                return;
            }
            else {
                beep();
                return;
            }
        }
        if (k0 == '\x15' || k0 == '\x18') {
            rubout(input.length);
            input = '';
            xvt.typeahead = '';
            return;
        }
        if (k0 == '\r') {
            if (!input.length && enter.length > 0) {
                input = enter;
                if (echo)
                    out(input);
            }
            else if (input.length < entryMin) {
                if (!echo)
                    input = '';
                beep();
                return;
            }
            xvt.entry = input;
            xvt.terminator = k0;
            process.stdin.pause();
            if (k.length > 1)
                xvt.typeahead = k.substr(1);
            return;
        }
        if (k0 < ' ') {
            if (eol) {
                if (cancel.length) {
                    rubout(input.length);
                    xvt.entry = cancel;
                    out(xvt.entry);
                }
                else
                    xvt.entry = input;
                xvt.terminator = k;
                process.stdin.pause();
                return;
            }
            let cook = 1;
            xvt.terminator = `^${String.fromCharCode(k0.charCodeAt(0) + 64)}`;
            if (k0 == '\x1B') {
                rubout(input.length);
                cook = 3;
                switch (k.substr(1)) {
                    case '[A':
                        xvt.terminator = '[UP]';
                        break;
                    case '[B':
                        xvt.terminator = '[DOWN]';
                        break;
                    case '[C':
                        xvt.terminator = '[RIGHT]';
                        break;
                    case '[D':
                        xvt.terminator = '[LEFT]';
                        break;
                    case '[11~':
                        cook++;
                    case '[1P':
                        cook++;
                    case 'OP':
                        xvt.terminator = '[F1]';
                        break;
                    case '[12~':
                        cook++;
                    case '[1Q':
                        cook++;
                    case 'OQ':
                        xvt.terminator = '[F2]';
                        break;
                    case '[13~':
                        cook++;
                    case '[1R':
                        cook++;
                    case 'OR':
                        xvt.terminator = '[F3]';
                        break;
                    case '[14~':
                        cook++;
                    case '[1S':
                        cook++;
                    case 'OS':
                        xvt.terminator = '[F4]';
                        break;
                    case '[15~':
                        cook = 5;
                        xvt.terminator = '[F5]';
                        break;
                    case '[17~':
                        cook = 5;
                        xvt.terminator = '[F6]';
                        break;
                    case '[18~':
                        cook = 5;
                        xvt.terminator = '[F7]';
                        break;
                    case '[19~':
                        cook = 5;
                        xvt.terminator = '[F8]';
                        break;
                    case '[20~':
                        cook = 5;
                        xvt.terminator = '[F9]';
                        break;
                    case '[21~':
                        cook = 5;
                        xvt.terminator = '[F10]';
                        break;
                    case '[23~':
                        cook = 5;
                        xvt.terminator = '[F11]';
                        break;
                    case '[24~':
                        cook = 5;
                        xvt.terminator = '[F12]';
                        break;
                    case '[1~':
                    case '[7~':
                        cook++;
                    case '[H':
                        xvt.terminator = '[HOME]';
                        break;
                    case '[2~':
                        cook++;
                        xvt.terminator = '[INSERT]';
                        break;
                    case '[3~':
                        cook++;
                        xvt.terminator = '[DELETE]';
                        break;
                    case '[4~':
                    case '[8~':
                        cook++;
                    case '[F':
                        xvt.terminator = '[END]';
                        break;
                    case '[5~':
                        cook++;
                        xvt.terminator = '[PGUP]';
                        break;
                    case '[6~':
                        cook++;
                        xvt.terminator = '[PGDN]';
                        break;
                    default:
                        cook = 1;
                        xvt.terminator = '[ESC]';
                        break;
                }
            }
            xvt.entry = k.substr(0, cook);
            xvt.typeahead = k.substr(cook);
            process.stdin.pause();
            return;
        }
        if (k.length > 1)
            xvt.typeahead = k.substr(1);
        if (eol || lines) {
            if (entryMax > 0 && input.length >= entryMax) {
                beep();
                if (lines && (line + 1) < lines) {
                    xvt.entry = input;
                    xvt.terminator = k0;
                    if (k0 !== ' ') {
                        let i = input.lastIndexOf(' ');
                        if (i > 0) {
                            rubout(input.substring(i).length);
                            xvt.entry = input.substring(0, i);
                            xvt.typeahead = input.substring(i + 1) + k0 + xvt.typeahead;
                        }
                    }
                    process.stdin.pause();
                }
                else
                    xvt.typeahead = '';
                return;
            }
            if (xvt.typeahead.length)
                process.stdin.pause();
        }
        if (echo)
            out(k0);
        input += k0;
        if (!eol && input.length >= entryMax) {
            xvt.entry = input;
            xvt.terminator = k0;
            process.stdin.pause();
        }
    });
    process.on('SIGHUP', function () {
        outln(xvt.off, ' ** ', xvt.faint, 'hangup', xvt.off, ' ** ');
        xvt.reason = xvt.reason || 'hangup';
        xvt.carrier = false;
        hangup();
    });
    process.on('SIGINT', function () {
        outln(xvt.off, ' ** ', xvt.bright, 'interrupt', xvt.off, ' ** ');
        xvt.reason = xvt.reason || 'interrupted';
        xvt.carrier = false;
        hangup();
    });
    process.stdin.on('pause', () => {
        if (xvt.waiting)
            xvt.waiting();
    });
    process.stdin.on('resume', () => {
        if (abort) {
            abort = false;
            xvt.typeahead = '';
        }
        if (xvt.typeahead)
            process.stdin.emit('data', '');
    });
    xvt.app = new session();
})(xvt || (xvt = {}));
module.exports = xvt;
//# sourceMappingURL=xvt.js.map