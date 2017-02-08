/*****************************************************************************\
 *  XVT authored by: Robert Hurst <theflyingape@gmail.com>                   *
 *      an event-driven terminal session handler                             *
 *                                                                           *
 * - emulation interface: dumb, VT100, ANSI-PC, ANSI-UTF emulation           *
 * - user input interface: formatted and roll-and-scroll                     *
\*****************************************************************************/
"use strict";
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
    xvt.cll = -2;
    xvt.clear = -1;
    xvt.reset = 0; // all attributes off, default color
    xvt.bright = 1;
    xvt.faint = 2;
    xvt.uline = 4;
    xvt.blink = 5;
    xvt.reverse = 7;
    xvt.off = 20; //  turn any attribute on -> off, except color
    xvt.nobright = 21;
    xvt.nofaint = 22;
    xvt.nouline = 24;
    xvt.noblink = 25;
    xvt.normal = 27;
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
    //  ░ ▒ ▓ █ 
    xvt.LGradient = {
        VT: '\x1B(0\x1B[2ma\x1B[ma\x1B[7m \x1B[1m \x1B[27m\x1B(B',
        PC: '\xB0\xB1\xB2\xDB',
        XT: '\u2591\u2592\u2593\u2588',
        dumb: ' :: '
    };
    //  █ ▓ ▒ ░ 
    xvt.RGradient = {
        VT: '\x1B(0\x1B[1;7m \x1B[21m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
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
            if (process.stdin.isTTY)
                process.stdin.setRawMode(true);
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
                out('\n?xvt form error, field undefined: "', name, '"\n');
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
                out(xvt.reset);
                let row = xvt.validator.isDefined(p.row) ? p.row : 0;
                let col = xvt.validator.isDefined(p.col) ? p.col : 0;
                if (row && col)
                    plot(row, col); //  formatted screen
                else
                    out('\n'); //  roll-and-scroll
                if (xvt.validator.isBoolean(p.pause)) {
                    xvt.echo = false;
                    xvt.eol = false;
                    if (!xvt.validator.isDefined(p.prompt))
                        p.prompt = '-pause-';
                    out(xvt.reverse, p.prompt, xvt.reset);
                }
                else {
                    xvt.echo = xvt.validator.isDefined(p.echo) ? p.echo : true;
                    xvt.eol = xvt.validator.isDefined(p.eol) ? p.eol : true;
                    if (!xvt.validator.isDefined(p.promptStyle))
                        p.promptStyle = xvt.defaultPromptStyle;
                    for (let n = 0; n < p.promptStyle.length; n++)
                        out(p.promptStyle[n]);
                    if (xvt.validator.isDefined(p.prompt))
                        out(p.prompt);
                    if (!xvt.validator.isDefined(p.inputStyle))
                        p.inputStyle = xvt.defaultInputStyle;
                    for (let n = 0; n < p.inputStyle.length; n++)
                        out(p.inputStyle[n]);
                }
                if (!xvt.eol && !xvt.enter.length)
                    xvt.enter = ' ';
                xvt.idleTimeout = xvt.validator.isDefined(p.timeout) ? p.timeout : xvt.defaultTimeout;
                xvt.entryMin = xvt.validator.isDefined(p.min) ? p.min : 0;
                xvt.entryMax = xvt.validator.isDefined(p.max) ? p.max : (xvt.eol ? 0 : 1);
                yield read();
                if (xvt.validator.isDefined(p.match)) {
                    if (!p.match.test(xvt.entry)) {
                        this.refocus();
                        return;
                    }
                }
                if (xvt.validator.isBoolean(p.pause))
                    rubout(p.prompt.length);
                out(xvt.reset);
                p.cb();
            });
        }
    }
    xvt.session = session;
    xvt.app = new session();
    xvt.modem = false;
    xvt.defaultTimeout = -1;
    xvt.pollingMS = 100;
    xvt.sessionStart = new Date();
    xvt.entry = '';
    xvt.enter = '';
    xvt.cancel = '';
    xvt.echo = true;
    xvt.eol = true;
    xvt.entryMin = 0;
    xvt.entryMax = 0;
    xvt.defaultInputStyle = [xvt.bright, xvt.white];
    xvt.defaultPromptStyle = [xvt.cyan];
    function read() {
        return __awaiter(this, void 0, void 0, function* () {
            xvt.entry = '';
            let retry = xvt.idleTimeout * (1000 / xvt.pollingMS);
            let warn = retry / 2;
            while (--retry && !xvt.entry.length) {
                yield wait(xvt.pollingMS);
                if (xvt.idleTimeout > 0 && retry == warn) {
                    beep();
                }
            }
            input = '';
            if (!retry) {
                out(' ** timeout **\n', xvt.reset);
                if (xvt.cancel.length)
                    xvt.entry = xvt.cancel;
                else
                    hangup();
            }
        });
    }
    xvt.read = read;
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    xvt.wait = wait;
    function waste(ms) {
        let start = new Date().getTime() + (ms);
        while (new Date().getTime() <= start) { }
    }
    xvt.waste = waste;
    function attr(...out) {
        out.forEach(data => {
            if (typeof data == 'number') {
                if (xvt.emulation != 'dumb') {
                    switch (data) {
                        case xvt.cll:
                            text('\x1B[K');
                            break;
                        case xvt.clear:
                            text('\x1B[H\x1B[J');
                            break;
                        case xvt.reset:
                            SGR('0');
                            xvt.color = xvt.white;
                            xvt.bold = false;
                            xvt.dark = false;
                            xvt.ul = false;
                            xvt.flash = false;
                            xvt.rvs = false;
                            break;
                        case xvt.bright:
                            if (xvt.dark) {
                                SGR(xvt.nofaint.toString());
                                xvt.dark = false;
                                xvt.bold = false;
                            }
                            if (!xvt.bold)
                                SGR(xvt.bright.toString());
                            xvt.bold = true;
                            break;
                        case xvt.nobright:
                            if (xvt.bold)
                                SGR(xvt.nobright.toString());
                            xvt.bold = false;
                            break;
                        case xvt.faint:
                            if (xvt.bold) {
                                SGR(xvt.nobright.toString());
                                xvt.bold = false;
                                xvt.dark = false;
                            }
                            if (!xvt.dark)
                                SGR(xvt.faint.toString());
                            xvt.dark = true;
                            break;
                        case xvt.nofaint:
                            if (xvt.dark)
                                SGR(xvt.nofaint.toString());
                            xvt.dark = false;
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
                        case xvt.normal:
                            if (xvt.rvs)
                                SGR(xvt.normal.toString());
                            xvt.rvs = false;
                            break;
                        case xvt.off:
                            if (xvt.bold)
                                SGR((xvt.off + xvt.bright).toString());
                            if (xvt.dark)
                                SGR((xvt.off + xvt.faint).toString());
                            if (xvt.ul)
                                SGR((xvt.off + xvt.uline).toString());
                            if (xvt.flash)
                                SGR((xvt.off + xvt.blink).toString());
                            if (xvt.rvs)
                                SGR((xvt.off + xvt.reverse).toString());
                            xvt.bold = false;
                            xvt.dark = false;
                            xvt.ul = false;
                            xvt.flash = false;
                            xvt.rvs = false;
                            break;
                        default:
                            xvt.color = data;
                            if (data >= xvt.black && data <= xvt.white)
                                if (xvt.emulation !== 'VT')
                                    SGR(data.toString());
                            if (data >= xvt.Black && data <= xvt.White) {
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
        text('');
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
        if (xvt.modem) {
            out(xvt.reset, '+++');
            waste(600);
            out('\nOK\n');
            waste(300);
            out('ATH\n');
            waste(600);
            beep();
            waste(200);
            out('NO CARRIER\n');
            waste(300);
        }
        process.exit();
    }
    xvt.hangup = hangup;
    function out(...out) {
        process.stdout.write(attr(...out), xvt.emulation == 'XT' ? 'utf8' : 'ascii');
    }
    xvt.out = out;
    let _SGR = ''; //  Select Graphic Rendition
    let _text = ''; //  buffer constructed emulation output(s)
    function SGR(attr) {
        if (xvt.emulation != 'dumb') {
            if (_SGR == '')
                _SGR = '\x1B[';
            else
                attr = ';' + attr;
            _SGR += attr;
        }
    }
    function text(s) {
        if (_SGR.length) {
            _text += _SGR + 'm';
            _SGR = '';
        }
        _text += s;
    }
    function enquiry(ENQ) {
        return __awaiter(this, void 0, void 0, function* () {
            input = '';
            xvt.echo = false;
            xvt.eol = true;
            out(ENQ);
            for (let retry = 5; retry && !input.length; retry--)
                yield this.wait(100);
            xvt.entry = input;
            console.log(input);
            input = '';
        });
    }
    function plot(row, col) {
        out('\x1B[', row.toString(), ';', col.toString(), 'H');
    }
    xvt.plot = plot;
    function rubout(n = 1, c = ' ') {
        for (let i = 0; i < n; i++)
            out('\x08', c, '\x08');
    }
    xvt.rubout = rubout;
    //  signal & stdin event handlers
    let input = '';
    process.on('SIGHUP', function () {
        out(' ** hangup ** \n', xvt.reset);
        hangup();
    });
    process.on('SIGINT', function () {
        out(' ** interrupt ** \n', xvt.reset);
        hangup();
    });
    //  capture VT user input
    process.stdin.on('data', function (key) {
        let k = key.toString(xvt.emulation == 'XT' ? 'utf8' : 'ascii', 0, 1);
        //  ctrl-d or ctrl-z to disconnect the session
        if (k == '\x04' || k == '\x1A') {
            out(' ** disconnect ** \n');
            hangup();
        }
        if (xvt.validator.isEmpty(xvt.app.focus) && !xvt.echo)
            return;
        //  rubout
        if (k == '\x08' || k == '\x7F') {
            if (xvt.eol && input.length > 0) {
                input = input.substr(0, input.length - 1);
                if (xvt.echo)
                    rubout();
                return;
            }
            else {
                beep();
                return;
            }
        }
        //  ctrl-u or ctrl-x cancel typeahead
        if (k == '\x15' || k == '\x18') {
            if (xvt.echo)
                rubout(input.length);
            input = '';
            return;
        }
        //  any text entry mode requires <CR> as the input line terminator
        if (k == '\x0D') {
            if (input.length < xvt.entryMin) {
                if (!xvt.echo)
                    input = '';
                beep();
                return;
            }
            if (!input.length && xvt.enter.length > 0) {
                input = xvt.enter;
                if (xvt.echo)
                    out(input);
            }
            xvt.entry = input;
            return;
        }
        //  eat other control keys
        if (k < ' ') {
            if (xvt.eol)
                return;
            //  let's cook any cursor key event if not a line entry prompt
            if (k === '\x1B') {
                k = key.toString(xvt.emulation == 'XT' ? 'utf8' : 'ascii', 1, key.length);
                switch (k) {
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
                }
            }
            else {
                k = '^' + String.fromCharCode(64 + k.charCodeAt(0));
            }
            xvt.entry = k;
            return;
        }
        //  don't exceed maximum input allowed
        if (xvt.entryMax > 0 && input.length >= xvt.entryMax) {
            beep();
            return;
        }
        if (xvt.echo)
            out(k);
        input += k;
        //  terminate entry if input size is met
        if (!xvt.eol && input.length >= xvt.entryMax) {
            xvt.entry = input;
        }
    });
})(xvt || (xvt = {}));
module.exports = xvt;
