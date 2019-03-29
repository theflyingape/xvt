"use strict";
/*****************************************************************************\
 *  XVT authored by: Robert Hurst <theflyingape@gmail.com>                   *
 *      an event-driven terminal session handler                             *
 *                                                                           *
 * - emulation interface: dumb, VT100, ANSI-PC, ANSI-UTF emulation           *
 * - user input interface: formatted and roll-and-scroll                     *
\*****************************************************************************/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const class_validator_1 = require("class-validator");
var xvt;
(function (xvt) {
    /*
    export interface Form {
        prompts: iField[]
    }
    
    export interface iForm {
        [key: string]: Form
    }
    */
    xvt.validator = new class_validator_1.Validator();
    //  SGR (https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_.28Select_Graphic_Rendition.29_parameters)
    xvt.cll = -2;
    xvt.clear = -1;
    xvt.reset = 0; // all attributes off, default color
    xvt.bright = 1; // make brighter
    xvt.faint = 2; // make dimmer
    xvt.uline = 4;
    xvt.blink = 5; //  not widely supported, unfortunately
    xvt.reverse = 7;
    xvt.off = 20; //  turn any attribute on -> off, except color
    xvt.nobright = 21; //  not widely supported: cancels bold only
    xvt.normal = 22; //  cancels bold (really?) and faint
    xvt.nouline = 24;
    xvt.noblink = 25;
    xvt.noreverse = 27;
    xvt.black = 30; //  foreground colors
    xvt.red = 31;
    xvt.green = 32;
    xvt.yellow = 33;
    xvt.blue = 34;
    xvt.magenta = 35;
    xvt.cyan = 36;
    xvt.white = 37;
    xvt.Black = 40; //  background colors
    xvt.Red = 41;
    xvt.Green = 42;
    xvt.Yellow = 43;
    xvt.Blue = 44;
    xvt.Magenta = 45;
    xvt.Cyan = 46;
    xvt.White = 47;
    xvt.lblack = 90; //  lighter foreground colors
    xvt.lred = 91;
    xvt.lgreen = 92;
    xvt.lyellow = 93;
    xvt.lblue = 94;
    xvt.lmagenta = 95;
    xvt.lcyan = 96;
    xvt.lwhite = 97;
    xvt.lBlack = 100; //  lighter background colors
    xvt.lRed = 101;
    xvt.lGreen = 102;
    xvt.lYellow = 103;
    xvt.lBlue = 104;
    xvt.lMagenta = 105;
    xvt.lCyan = 106;
    xvt.lWhite = 107;
    //  ░ ▒ ▓ █ 
    xvt.LGradient = {
        VT: '\x1B(0\x1B[2ma\x1B[ma\x1B[7m \x1B[1m \x1B[27m\x1B(B',
        PC: '\xB0\xB1\xB2\xDB',
        XT: '\u2591\u2592\u2593\u2588',
        dumb: ' :: '
    };
    //  █ ▓ ▒ ░ 
    xvt.RGradient = {
        VT: '\x1B(0\x1B[1;7m \x1B[22m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
        PC: '\xDB\xB2\xB1\xB0',
        XT: '\u2588\u2593\u2592\u2591',
        dumb: ' :: '
    };
    //  ─ └ ┴ ┘ ├ ┼ ┤ ┌ ┬ ┐ │
    xvt.Draw = {
        VT: ['q', 'm', 'v', 'j', 't', 'n', 'u', 'l', 'w', 'k', 'x'],
        PC: ['\xC4', '\xC0', '\xC1', '\xD9', '\xC3', '\xC5', '\xB4', '\xDA', '\xC2', '\xBF', '\xB3'],
        XT: ['\u2500', '\u2514', '\u2534', '\u2518', '\u251C', '\u253C', '\u2524', '\u250C', '\u252C', '\u2510', '\u2502'],
        dumb: ['-', '+', '^', '+', '>', '+', '<', '+', 'v', '+', '|']
    };
    //  · 
    xvt.Empty = {
        VT: '\x1B(0\x7E\x1B(B',
        PC: '\xFA',
        XT: '\u00B7',
        dumb: '.'
    };
    class session {
        constructor() {
            /*  const tty = require('tty')
                if (tty.isatty(0))
                    tty.ReadStream(0).setRawMode(true)  */
            if (process.stdin.isTTY)
                process.stdin.setRawMode(true);
            xvt.carrier = true;
            xvt.sessionStart = new Date();
        }
        get form() {
            return this._fields;
        }
        set form(name) {
            this._fields = name;
        }
        get focus() { return this._focus; }
        set focus(name) {
            let p = this._fields[name];
            if (!xvt.validator.isDefined(p)) {
                outln('\n?xvt form error :: field "', name, '" undefined');
                this.refocus();
                return;
            }
            this._focus = name;
            this._read();
        }
        nofocus(keep = false) {
            xvt.echo = keep;
            xvt.entryMin = 0;
            xvt.entryMax = 0;
            xvt.eol = false;
            this._focus = null;
        }
        refocus() {
            if (xvt.validator.isNotEmpty(this._focus))
                this.focus = this.focus;
        }
        _read() {
            return __awaiter(this, void 0, void 0, function* () {
                let p = this._fields[this.focus];
                xvt.cancel = xvt.validator.isDefined(p.cancel) ? p.cancel : '';
                xvt.enter = xvt.validator.isDefined(p.enter) ? p.enter : '';
                if (p.enq) {
                    xvt.enq = true;
                    out(p.prompt);
                    xvt.idleTimeout = 5;
                    yield read();
                    xvt.enq = false;
                    p.cb();
                    return;
                }
                out(xvt.reset);
                let row = xvt.validator.isDefined(p.row) ? p.row : 0;
                let col = xvt.validator.isDefined(p.col) ? p.col : 0;
                if (row && col)
                    plot(row, col); //  formatted screen
                else
                    outln(); //  roll-and-scroll
                if (p.pause) {
                    xvt.echo = false;
                    xvt.eol = false;
                    if (!xvt.validator.isDefined(p.prompt))
                        p.prompt = '-pause-';
                    out('\r', xvt.reverse, p.prompt, xvt.reset);
                }
                else {
                    xvt.echo = xvt.validator.isDefined(p.echo) ? p.echo : true;
                    xvt.eol = xvt.validator.isDefined(p.eol) ? p.eol : true;
                    if (!xvt.validator.isDefined(p.promptStyle))
                        p.promptStyle = xvt.defaultPromptStyle;
                    out(...p.promptStyle);
                    if (xvt.validator.isDefined(p.prompt))
                        out(p.prompt);
                    if (!xvt.validator.isDefined(p.inputStyle))
                        p.inputStyle = xvt.defaultInputStyle;
                    out(...p.inputStyle);
                }
                if (!xvt.eol && !xvt.enter.length)
                    xvt.enter = ' ';
                xvt.idleTimeout = xvt.validator.isDefined(p.timeout) ? p.timeout : xvt.defaultTimeout;
                xvt.entryMin = xvt.validator.isDefined(p.min) ? p.min : 0;
                xvt.entryMax = xvt.validator.isDefined(p.max) ? p.max : (xvt.eol ? 0 : 1);
                xvt.eraser = xvt.validator.isDefined(p.eraser) ? p.eraser : ' ';
                if (row && col && xvt.echo && xvt.entryMax) {
                    for (let i = 0; i < xvt.entryMax; i++)
                        out(xvt.eraser);
                    for (let i = 0; i < xvt.entryMax; i++)
                        out('\x08');
                }
                yield read();
                out(xvt.reset);
                if (xvt.validator.isDefined(p.match)) {
                    if (!p.match.test(xvt.entry)) {
                        this.refocus();
                        return;
                    }
                }
                if (xvt.validator.isBoolean(p.pause)) {
                    xvt.echo = true;
                    out('\r', xvt.cll);
                }
                p.cb();
            });
        }
    }
    xvt.session = session;
    xvt.carrier = false;
    xvt.modem = false;
    xvt.reason = '';
    xvt.defaultTimeout = -1;
    xvt.idleTimeout = 0;
    xvt.pollingMS = 100;
    xvt.sessionAllowed = 0;
    xvt.sessionStart = null;
    xvt.terminator = null;
    xvt.typeahead = '';
    xvt.entry = '';
    xvt.enter = '';
    xvt.cancel = '';
    xvt.echo = true;
    xvt.eol = true;
    xvt.entryMin = 0;
    xvt.entryMax = 0;
    xvt.eraser = ' ';
    xvt.defaultInputStyle = [xvt.bright, xvt.white];
    xvt.defaultPromptStyle = [xvt.cyan];
    xvt.enq = false;
    xvt.app = new session();
    //  ANSI using VT (DEC), PC (IBM), or XT (UTF-8) encoding, else dumb ASCII
    xvt.emulation = 'XT';
    //  SGR registers
    xvt.color = 0;
    xvt.bold = false;
    xvt.dim = false;
    xvt.ul = false;
    xvt.flash = false;
    xvt.rvs = false;
    let _color = 0;
    let _bold = false;
    let _dim = false;
    let _ul = false;
    let _flash = false;
    let _rvs = false;
    let _SGR = ''; //  Select Graphic Rendition
    let _text = ''; //  buffer constructed emulation output(s)
    function read() {
        return __awaiter(this, void 0, void 0, function* () {
            let retry = xvt.idleTimeout * (1000 / xvt.pollingMS) >> 0;
            let warn = retry >> 1;
            xvt.entry = '';
            xvt.terminator = null;
            try {
                process.stdin.resume();
                while (xvt.carrier && retry && xvt.validator.isEmpty(xvt.terminator)) {
                    if (xvt.typeahead)
                        process.stdin.emit('data', '');
                    else
                        yield wait(xvt.pollingMS);
                    if (xvt.idleTimeout > 0 && --retry == warn)
                        beep();
                    if (xvt.sessionAllowed > 0 && !(retry % xvt.pollingMS)) {
                        let elapsed = (new Date().getTime() - xvt.sessionStart.getTime()) / 1000;
                        if (elapsed > xvt.sessionAllowed)
                            xvt.carrier = false;
                    }
                }
            }
            catch (err) {
                xvt.carrier = false;
            }
            if (!xvt.carrier || !retry) {
                //  any remaining cancel operations will take over, else bye-bye
                if (xvt.cancel.length) {
                    rubout(input.length);
                    xvt.entry = xvt.cancel;
                    out(xvt.entry);
                }
                else {
                    beep();
                    if (!xvt.carrier) {
                        outln(' ** your session expired ** ');
                        xvt.reason = 'got exhausted';
                    }
                    if (!retry) {
                        outln(' ** timeout ** ');
                        xvt.reason = 'fallen asleep';
                    }
                    waste(1000);
                    hangup();
                }
                //return new Promise(reject => 'timeout')
            }
            if (xvt.cancel.length && xvt.terminator === '\x1B') {
                rubout(input.length);
                xvt.entry = xvt.cancel;
                out(xvt.entry);
            }
            //  sanity resets back to default stdin processing
            xvt.echo = true;
            xvt.eol = true;
            xvt.entryMin = 0;
            xvt.entryMax = 0;
            xvt.eraser = ' ';
            input = '';
        });
    }
    xvt.read = read;
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    xvt.wait = wait;
    function waste(ms) {
        if (xvt.carrier) {
            let start = new Date().getTime() + (ms);
            while (new Date().getTime() <= start) { }
        }
    }
    xvt.waste = waste;
    function attr(...out) {
        out.forEach(data => {
            if (typeof data == 'number') {
                if (xvt.emulation !== 'dumb') {
                    switch (data) {
                        case xvt.cll:
                            text('\x1B[K');
                            break;
                        case xvt.clear:
                            text('\x1B[H\x1B[J');
                            break;
                        case xvt.off:
                        case xvt.reset:
                            if (xvt.color || xvt.bold || xvt.dim || xvt.ul || xvt.flash || xvt.rvs)
                                text('\x1B[m');
                            xvt.color = 0;
                            xvt.bold = false;
                            xvt.dim = false;
                            xvt.ul = false;
                            xvt.flash = false;
                            xvt.rvs = false;
                            break;
                        case xvt.bright:
                            if (xvt.dim) { //  make bright/dim intensity mutually exclusive
                                SGR(xvt.normal.toString());
                                xvt.bold = false;
                                xvt.dim = false;
                            }
                            if (!xvt.bold) {
                                SGR(xvt.bright.toString());
                                if (!xvt.color) {
                                    xvt.color = xvt.white;
                                    SGR(xvt.color.toString());
                                }
                            }
                            xvt.bold = true;
                            break;
                        case xvt.faint:
                            if (xvt.bold) { //  make bright/dim intensity mutually exclusive
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
                                if (xvt.emulation !== 'VT')
                                    SGR(data.toString());
                            if (data >= xvt.Black && data <= xvt.White || data >= xvt.lBlack && data <= xvt.lWhite) {
                                if (xvt.emulation !== 'VT')
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
                else if (data == xvt.clear)
                    text('\f');
            }
            else
                text(data);
        });
        text();
        let result = _text;
        _text = '';
        return result;
    }
    xvt.attr = attr;
    function beep() {
        out('\x07');
    }
    xvt.beep = beep;
    function hangup() {
        if (xvt.ondrop)
            xvt.ondrop();
        xvt.ondrop = null;
        //  1.5-seconds of retro-fun  :)
        if (xvt.carrier && xvt.modem) {
            out(xvt.reset, '+++');
            waste(500);
            outln('\nOK');
            waste(400);
            out('ATH\r');
            waste(300);
            beep();
            waste(200);
            outln('\nNO CARRIER');
            waste(100);
        }
        xvt.carrier = false;
        process.exit();
    }
    xvt.hangup = hangup;
    function out(...out) {
        try {
            if (xvt.carrier)
                process.stdout.write(attr(...out), xvt.emulation == 'XT' ? 'utf8' : 'ascii');
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
        out(xvt.emulation == 'XT' ? '\x1B[u' : '\x1B8');
        xvt.color = _color;
        xvt.bold = _bold;
        xvt.dim = _dim;
        xvt.ul = _ul;
        xvt.flash = _flash;
        xvt.rvs = _rvs;
    }
    xvt.restore = restore;
    function save() {
        _color = xvt.color;
        _bold = xvt.bold;
        _dim = xvt.dim;
        _ul = xvt.ul;
        _flash = xvt.flash;
        _rvs = xvt.rvs;
        out(xvt.emulation == 'XT' ? '\x1B[s' : '\x1B7');
    }
    xvt.save = save;
    function SGR(attr) {
        if (xvt.emulation !== 'dumb') {
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
    }
    function plot(row, col) {
        out('\x1B[', row.toString(), ';', col.toString(), 'H');
    }
    xvt.plot = plot;
    function rubout(n = 1) {
        if (xvt.echo)
            for (let i = 0; i < n; i++)
                out('\x08', xvt.eraser, '\x08');
    }
    xvt.rubout = rubout;
    //  signal & stdin event handlers
    let input = '';
    process.on('SIGHUP', function () {
        outln(' ** hangup ** ');
        xvt.reason = 'hangup';
        xvt.carrier = false;
        hangup();
    });
    process.on('SIGINT', function () {
        outln(' ** interrupt ** ');
        xvt.reason = 'interrupted';
        xvt.carrier = false;
        hangup();
    });
    //  capture VT user input
    process.stdin.on('data', function (key) {
        let k;
        let k0;
        try {
            k = xvt.typeahead + key.toString(xvt.emulation == 'XT' ? 'utf8' : 'ascii');
            k0 = k.substr(0, 1);
            xvt.typeahead = '';
        }
        catch (err) {
            console.log(k, k.split('').map((c) => { return c.charCodeAt(0); }));
            return;
        }
        // special ENQUIRY result
        if (xvt.enq) {
            xvt.entry = k;
            xvt.terminator = k0;
            process.stdin.pause();
            return;
        }
        //  ctrl-d or ctrl-z to disconnect the session
        if (k0 == '\x04' || k0 == '\x1A') {
            out(' ** disconnect ** \n');
            xvt.reason = 'manual disconnect';
            hangup();
        }
        //if (validator.isEmpty(app.focus) && !echo) return
        //  rubout
        if (k0 == '\x08' || k0 == '\x7F') {
            if (xvt.eol && input.length > 0) {
                input = input.substr(0, input.length - 1);
                rubout();
                return;
            }
            else {
                beep();
                return;
            }
        }
        //  ctrl-u or ctrl-x cancel typeahead
        if (k0 == '\x15' || k0 == '\x18') {
            rubout(input.length);
            input = '';
            xvt.typeahead = '';
            return;
        }
        //  any text entry mode requires <CR> as the input line terminator
        if (k0 == '\x0D') {
            if (!input.length && xvt.enter.length > 0) {
                input = xvt.enter;
                if (xvt.echo)
                    out(input);
            }
            else if (input.length < xvt.entryMin) {
                if (!xvt.echo)
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
        //  eat other control keys
        if (k0 < ' ') {
            if (xvt.eol) {
                if (xvt.cancel.length) {
                    rubout(input.length);
                    xvt.entry = xvt.cancel;
                    out(xvt.entry);
                }
                else
                    xvt.entry = input;
                xvt.terminator = k;
                process.stdin.pause();
                return;
            }
            //  let's cook for a special key event, if not prompting for a line of text
            if (k0 === '\x1B') {
                rubout(input.length);
                switch (k.substr(1)) {
                    case '[A':
                        k = '[UP]';
                        break;
                    case '[B':
                        k = '[DOWN]';
                        break;
                    case '[C':
                        k = '[RIGHT]';
                        break;
                    case '[D':
                        k = '[LEFT]';
                        break;
                    case 'OP':
                    case '[11~':
                        k = '[F1]';
                        break;
                    case 'OQ':
                    case '[12~':
                        k = '[F2]';
                        break;
                    case 'OR':
                    case '[13~':
                        k = '[F3]';
                        break;
                    case 'OS':
                    case '[14~':
                        k = '[F4]';
                        break;
                    case '[15~':
                        k = '[F5]';
                        break;
                    case '[17~':
                        k = '[F6]';
                        break;
                    case '[18~':
                        k = '[F7]';
                        break;
                    case '[19~':
                        k = '[F8]';
                        break;
                    case '[20~':
                        k = '[F9]';
                        break;
                    case '[21~':
                        k = '[F10]';
                        break;
                    case '[23~':
                        k = '[F11]';
                        break;
                    case '[24~':
                        k = '[F12]';
                        break;
                    case '[H':
                        k = '[HOME]';
                        break;
                    case '[F':
                        k = '[END]';
                        break;
                    case '[2~':
                        k = '[INS]';
                        break;
                    case '[3~':
                        k = '[DEL]';
                        break;
                    default:
                        k = '[ESC]';
                        break;
                }
            }
            else
                k = '^' + String.fromCharCode(64 + k.charCodeAt(0));
            xvt.entry = input;
            xvt.terminator = k;
            process.stdin.pause();
            return;
        }
        if (k.length > 1)
            xvt.typeahead = k.substr(1);
        //  don't exceed maximum input allowed
        if (xvt.eol && xvt.entryMax > 0 && input.length >= xvt.entryMax) {
            beep();
            xvt.typeahead = '';
            return;
        }
        if (xvt.echo)
            out(k0);
        input += k0;
        //  terminate entry if input size is met
        if (!xvt.eol && input.length >= xvt.entryMax) {
            xvt.entry = input;
            xvt.terminator = k0;
            process.stdin.pause();
        }
    });
})(xvt || (xvt = {}));
module.exports = xvt;
