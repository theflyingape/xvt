"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xvt = void 0;
class xvt {
    constructor(e, init = true, log = true, form = null) {
        this.reset = 0;
        this.bright = 1;
        this.faint = 2;
        this.uline = 4;
        this.blink = 5;
        this.reverse = 7;
        this.off = 20;
        this.nobright = 21;
        this.normal = 22;
        this.nouline = 24;
        this.noblink = 25;
        this.noreverse = 27;
        this.black = 30;
        this.red = 31;
        this.green = 32;
        this.yellow = 33;
        this.blue = 34;
        this.magenta = 35;
        this.cyan = 36;
        this.white = 37;
        this.Black = 40;
        this.Red = 41;
        this.Green = 42;
        this.Yellow = 43;
        this.Blue = 44;
        this.Magenta = 45;
        this.Cyan = 46;
        this.White = 47;
        this.lblack = 90;
        this.lred = 91;
        this.lgreen = 92;
        this.lyellow = 93;
        this.lblue = 94;
        this.lmagenta = 95;
        this.lcyan = 96;
        this.lwhite = 97;
        this.lBlack = 100;
        this.lRed = 101;
        this.lGreen = 102;
        this.lYellow = 103;
        this.lBlue = 104;
        this.lMagenta = 105;
        this.lCyan = 106;
        this.lWhite = 107;
        this.cll = 254;
        this.clear = 255;
        this.carrier = false;
        this.modem = false;
        this.ondrop = null;
        this.reason = '';
        this.defaultColor = this.white;
        this.defaultPrompt = this.white;
        this.defaultTimeout = 0;
        this.defaultWarn = true;
        this.entry = '';
        this.idleTimeout = 0;
        this.sessionAllowed = 0;
        this.sessionStart = null;
        this.terminator = null;
        this.typeahead = '';
        this.col = 0;
        this.row = 0;
        this._col = 0;
        this._color = 0;
        this._bold = false;
        this._dim = false;
        this._ul = false;
        this._flash = false;
        this._row = 0;
        this._rvs = false;
        this._SGR = '';
        this._text = '';
        this._focus = 0;
        this.abort = false;
        this.cancel = '';
        this.delay = 0;
        this.echo = true;
        this.enq = false;
        this.enter = '';
        this.entryMin = 0;
        this.entryMax = 0;
        this.eol = true;
        this.eraser = ' ';
        this.input = '';
        this.line = 0;
        this.lines = 0;
        this.warn = this.defaultWarn;
        this._pad = 4;
        this._waiting = null;
        this.carrier = true;
        this.emulation = e || this.os.arch == 'arm64' ? 'PI' : this.os.type == 'linux' ? 'XT' : 'VT';
        this.sessionStart = new Date();
        if (init)
            this.stdio(log);
        if (form)
            this.form = form;
    }
    get os() {
        return require(+process.versions.node.split('.')[0] < 16 ? 'os' : 'node:os');
    }
    get emulation() {
        return this._emulation;
    }
    set emulation(e) {
        this._encoding = (e == 'PI' || e == 'XT') ? 'utf8' : 'ascii';
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
            PI: ' \u2591\u2592\u2588',
            XT: '\u2591\u2592\u2593\u2588',
            dumb: ' :: '
        }[this._emulation];
    }
    get RGradient() {
        return {
            VT: '\x1B(0\x1B[1;7m \x1B[22m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
            PC: '\xDB\xB2\xB1\xB0',
            PI: '\u2588\u2592\u2591 ',
            XT: '\u2588\u2593\u2592\u2591',
            dumb: ' :: '
        }[this._emulation];
    }
    get Draw() {
        return {
            VT: ['q', 'm', 'v', 'j', 't', 'n', 'u', 'l', 'w', 'k', 'x'],
            PC: ['\xC4', '\xC0', '\xC1', '\xD9', '\xC3', '\xC5', '\xB4', '\xDA', '\xC2', '\xBF', '\xB3'],
            PI: ['\u2500', '\u2514', '\u2534', '\u2518', '\u251C', '\u253C', '\u2524', '\u250C', '\u252C', '\u2510', '\u2502'],
            XT: ['\u2500', '\u2514', '\u2534', '\u2518', '\u251C', '\u253C', '\u2524', '\u250C', '\u252C', '\u2510', '\u2502'],
            dumb: ['-', '+', '^', '+', '>', '+', '<', '+', 'v', '+', '|']
        }[this._emulation];
    }
    get Empty() {
        return {
            VT: '\x1B(0\x7E\x1B(B',
            PC: '\xFA',
            PI: '\u00B7',
            XT: '\u00B7',
            dumb: '.'
        }[this._emulation];
    }
    SGR(attr) {
        if (this.emulation !== 'dumb') {
            if (this._SGR == '')
                this._SGR = '\x1B[';
            else
                attr = ';' + attr;
            this._SGR += attr;
        }
    }
    text(s) {
        if (this._SGR.length) {
            this._text += this._SGR + 'm';
            this._SGR = '';
        }
        if (typeof s == 'undefined') {
            const result = this._text;
            this._text = '';
            return result;
        }
        else {
            this._text += s;
            this.col += s.length;
        }
        return this._text;
    }
    attr(...params) {
        params.forEach(data => {
            if (typeof data == 'number') {
                if (data < 0) {
                    this.out(this.text());
                    this.sleep(-data);
                }
                else if (this.emulation !== 'dumb') {
                    switch (data) {
                        case this.cll:
                            this.text('\x1B[K');
                            break;
                        case this.clear:
                            this.text('\x1B[H\x1B[J');
                            this.row = 1;
                            this.col = 1;
                            break;
                        case this.off:
                            this.color = this.defaultColor;
                        case this.reset:
                            if (this.color || this.bold || this.dim || this.ul || this.flash || this.rvs) {
                                this._SGR = '';
                                this.text('\x1B[m');
                            }
                            this.color = 0;
                            this.bold = false;
                            this.dim = false;
                            this.ul = false;
                            this.flash = false;
                            this.rvs = false;
                            break;
                        case this.bright:
                            if (this.dim) {
                                this.SGR(this.normal);
                                this.bold = false;
                                this.dim = false;
                            }
                            if (!this.bold) {
                                this.SGR(this.bright);
                                if (!this.color) {
                                    this.color = this.defaultColor;
                                    this.SGR(this.color);
                                }
                            }
                            this.bold = true;
                            break;
                        case this.faint:
                            if (this.bold) {
                                this.SGR(this.normal);
                                this.bold = false;
                                this.dim = false;
                            }
                            if (!this.dim)
                                this.SGR(this.faint);
                            this.dim = true;
                            break;
                        case this.nobright:
                            if (this.bold)
                                this.SGR(this.nobright);
                            this.bold = false;
                            break;
                        case this.normal:
                            if (this.bold || this.dim) {
                                this.SGR(this.normal);
                                this.bold = false;
                                this.dim = false;
                            }
                            break;
                        case this.uline:
                            if (!this.ul)
                                this.SGR(this.uline);
                            this.ul = true;
                            break;
                        case this.nouline:
                            if (this.ul)
                                this.SGR(this.nouline);
                            this.ul = false;
                            break;
                        case this.blink:
                            if (!this.flash)
                                this.SGR(this.blink);
                            this.flash = true;
                            break;
                        case this.noblink:
                            if (this.flash)
                                this.SGR(this.noblink);
                            this.flash = false;
                            break;
                        case this.reverse:
                            if (!this.rvs)
                                this.SGR(this.reverse);
                            this.rvs = true;
                            break;
                        case this.noreverse:
                            if (this.rvs)
                                this.SGR(this.noreverse);
                            this.rvs = false;
                            break;
                        default:
                            this.color = data;
                            if (data >= this.black && data <= this.white || data >= this.lblack && data <= this.lwhite)
                                if (this.emulation !== 'VT')
                                    this.SGR(data);
                            if (data >= this.Black && data <= this.White || data >= this.lBlack && data <= this.lWhite) {
                                if (this.emulation !== 'VT')
                                    this.SGR(data);
                                else {
                                    if (!this.rvs)
                                        this.SGR(this.reverse);
                                    this.rvs = true;
                                }
                            }
                            break;
                    }
                }
                else if (data == this.clear) {
                    this.text('\f');
                    this.row = 1;
                    this.col = 1;
                }
            }
            else {
                this.text(data);
                if (typeof data == 'string') {
                    let lines = data.split('\n');
                    if (lines.length > 1) {
                        this.row += lines.length - 1;
                        this.col = lines[lines.length - 1].length + 1;
                    }
                }
            }
        });
        return this.text();
    }
    beep() {
        this.out('\x07');
    }
    drain() {
        this.abort = true;
        if (this.typeahead && process.stdin.isPaused)
            process.stdin.resume();
    }
    hangup() {
        if (this.ondrop)
            this.ondrop();
        this.ondrop = null;
        if (this.carrier && this.modem) {
            this.out(this.off, '+', -125, '+', -125, '+', -250);
            this.outln('\nOK');
            this.out(-400, 'ATH\r', -300);
            this.outln('\x07\n', -200, 'NO CARRIER');
            this.sleep(100);
        }
        this.carrier = false;
        process.exit();
    }
    out(...params) {
        try {
            if (this.carrier)
                process.stdout.write(this.attr(...params), this.encoding);
        }
        catch (err) {
            this.carrier = false;
        }
    }
    outln(...params) {
        this.out(this.attr(...params), this.reset, '\n');
    }
    pause(nextField, timeout = this.defaultTimeout, cb) {
        const save = this.form;
        this.form = {
            0: {
                cb: () => {
                    if (cb)
                        cb();
                    this.form = save;
                    this.focus = nextField;
                }, pause: true, timeout: timeout
            }
        };
    }
    plot(row = 1, col = 1) {
        this.out(`\x1B[${row};${col}H`);
        this.row = row;
        this.col = col;
    }
    restore() {
        this.out(this.emulation == 'VT' ? '\x1B8' : '\x1B[u');
        this.col = this._col;
        this.color = this._color;
        this.bold = this._bold;
        this.dim = this._dim;
        this.ul = this._ul;
        this.flash = this._flash;
        this.row = this._row;
        this.rvs = this._rvs;
    }
    rubout(n = 1, erase = this.echo) {
        if (erase) {
            this.out(`\b${this.eraser}\b`.repeat(n));
            this.col -= n;
        }
    }
    save() {
        this.out(this.emulation == 'VT' ? '\x1B7' : '\x1B[s');
        this._col = this.col;
        this._color = this.color;
        this._bold = this.bold;
        this._dim = this.dim;
        this._ul = this.ul;
        this._flash = this.flash;
        this._row = this.row;
        this._rvs = this.rvs;
    }
    sleep(ms) {
        if (this.carrier && ms > 0) {
            const t = ms > this._pad ? ms - this._pad : 1;
            try {
                require('child_process').execSync(`sleep ${t / 1000}`, { stdio: 'ignore', timeout: ms });
            }
            catch (err) {
                if (err.code == 'ETIMEDOUT' && this._pad < 25)
                    this._pad++;
            }
        }
    }
    get form() {
        return this._fields || null;
    }
    set form(name) {
        this._fields = name;
        if (this._fields[0])
            this.focus = 0;
    }
    get focus() {
        return this._focus;
    }
    set focus(name) {
        try {
            if (this._fields[name]) {
                this._focus = name;
                this._read();
            }
            else {
                this.beep();
                this.outln(this.off, this.red, '?', this.bright, `xvt form ${name} error: `, this.reset, `field '${name}' undefined`);
                this.refocus();
            }
        }
        catch (_a) { }
    }
    async _read() {
        let p = this._fields[this.focus];
        this.cancel = p.cancel || '';
        this.delay = p.delay || 0;
        this.enter = p.enter || '';
        this.input = '';
        if (p.enq) {
            this.enq = true;
            this.warn = false;
            this.out(p.prompt);
            this.idleTimeout = 5;
            await this.read();
            p.cb();
            return;
        }
        let row = p.row || 0;
        let col = p.col || 0;
        if (row && col) {
            this.out(this.reset);
            this.plot(row, col);
        }
        else
            this.outln();
        if (p.pause) {
            this.cancel = '^';
            this.echo = false;
            this.eol = false;
            if (!p.prompt)
                p.prompt = '-pause-';
            if (this.col > 1)
                this.outln();
            this.out(this.reverse, p.prompt, this.reset);
            this.drain();
        }
        else {
            this.echo = typeof p.echo == 'boolean' ? p.echo : true;
            this.eol = typeof p.eol == 'boolean' ? p.eol : true;
            if (p.prompt)
                this.out(this.defaultPrompt, p.prompt);
            this.lines = (p.lines || 0) > 1 ? 2 : 0;
            if (this.lines) {
                this.eol = true;
                this.line = 0;
                this.outln();
                this.out(this.bright, (this.line + 1).toString(), this.normal, '/', this.lines.toString(), this.faint, '] ', this.normal);
                this.multi = [];
            }
            this.out(this.defaultColor, this.bright);
        }
        this.entryMin = p.min || 0;
        this.entryMax = p.max || (this.lines ? 72 : this.eol ? 0 : 1);
        this.eraser = p.eraser || ' ';
        this.idleTimeout = p.timeout || this.defaultTimeout;
        this.warn = p.warn || this.defaultWarn;
        if (row && col && this.echo && this.entryMax)
            this.out(this.eraser.repeat(this.entryMax), '\b'.repeat(this.entryMax));
        await this.read();
        if (p.match && !p.match.test(this.entry)) {
            this.drain();
            this.refocus();
            return;
        }
        if (p.pause)
            this.rubout(7, true);
        if (this.lines) {
            do {
                this.multi[this.line] = this.entry;
                if (this.terminator == '[UP]') {
                    if (this.line) {
                        this.out('\x1B[A');
                        this.line--;
                    }
                    this.out('\r');
                }
                else {
                    this.outln();
                    this.line++;
                    if (!this.entry.length || this.line == this.lines) {
                        for (let i = this.line; i < this.lines; i++) {
                            this.outln(this.cll);
                            delete this.multi[i];
                        }
                        break;
                    }
                }
                this.out(this.bright, (this.line + 1).toString(), this.normal, '/', this.lines.toString(), this.faint, '] ', this.normal);
                this.out(this.defaultColor, this.bright);
                this.input = this.multi[this.line] || '';
                this.out(this.input);
                await this.read();
            } while (this.line < this.lines);
            this.entry = this.multi.join('\n');
            while (this.entry.slice(-1) == '\n')
                this.entry = this.entry.slice(0, -1);
        }
        p.cb();
    }
    async read() {
        this.entry = '';
        this.terminator = null;
        const idle = this.idleTimeout ? this.idleTimeout * (this.warn ? 500 : 1000) : 2147483647;
        let elapsed = new Date().getTime() / 1000 >> 0;
        let retry = true;
        if (this.carrier) {
            if (this.sessionAllowed && (elapsed - (this.sessionStart.getTime() / 1000)) > this.sessionAllowed) {
                this.outln(this.off, ' ** ', this.bright, 'your session expired', this.off, ' ** ', -600);
                this.reason = this.reason || 'got exhausted';
                this.hangup();
            }
        }
        else {
            this.warn = false;
            retry = false;
        }
        if (this.delay)
            this.sleep(this.delay);
        while (retry && !this.terminator) {
            await forInput(this, idle).catch(() => {
                this.beep();
                retry = this.carrier && this.warn;
                if (retry)
                    this.warn = false;
                else {
                    if (this.cancel.length) {
                        this.rubout(this.input.length);
                        this.entry = this.cancel;
                        if (this.echo)
                            this.out(this.entry);
                        this.terminator = '[ESC]';
                    }
                    else {
                        if (this.carrier) {
                            this.outln(this.off, ' ** ', this.faint, 'timeout', this.off, ' ** ');
                            this.reason = this.reason || 'fallen asleep';
                        }
                        this.hangup();
                    }
                }
            });
        }
        this.out(this.reset);
        function forInput(io, ms) {
            return new Promise((resolve, reject) => {
                io._waiting = () => { resolve(io.terminator); };
                if (process.stdin.isPaused)
                    process.stdin.resume();
                setTimeout(reject, io.carrier ? ms : io._pad);
            }).finally(() => { io._waiting = null; });
        }
    }
    refocus(prompt) {
        if (prompt)
            this._fields[this.focus].prompt = prompt;
        this.focus = this._focus;
    }
    stdio(log = false) {
        process.on('SIGHUP', () => {
            this.outln(this.off, ' ** ', this.faint, 'hangup', this.off, ' ** ');
            this.reason = this.reason || 'hangup';
            this.carrier = false;
            this.hangup();
        });
        process.on('SIGINT', () => {
            this.outln(this.off, ' ** ', this.bright, 'interrupt', this.off, ' ** ');
            this.reason = this.reason || 'interrupted';
            this.carrier = false;
            this.hangup();
        });
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.pause();
            process.stdin.on('data', (key) => {
                do {
                    let k = this.typeahead + (key ? key.toString() : '');
                    this.typeahead = '';
                    key = null;
                    let k0 = k.substring(0, 1);
                    this.terminator = null;
                    if (this.abort || this.enq) {
                        if (this.enq) {
                            this.entry = k.substring(k.indexOf('\x1B'));
                            this.terminator = k0;
                            this.enq = false;
                        }
                        this.abort = false;
                        process.stdin.pause();
                        break;
                    }
                    if (k.length > 1 && k0 >= ' ') {
                        const t = (this.entryMax || k.length) - this.input.length;
                        if (t > 1) {
                            let load = k.substring(0, t - 1);
                            const m = /[\x00-\x1F]/.exec(load);
                            if (m && m.index)
                                load = load.substring(0, m.index);
                            if (this.echo)
                                this.out(load);
                            this.input += load;
                            k = k.substring(load.length);
                            k0 = k.substring(0, 1);
                        }
                    }
                    this.typeahead = k.substring(1);
                    if (!k0)
                        continue;
                    if (k0 == '\x04') {
                        this.outln(this.off, ' ** disconnect ** ');
                        this.reason = 'manual disconnect';
                        this.hangup();
                    }
                    if (k == '\x1A') {
                        process.kill(process.pid, 'SIGHUP');
                        continue;
                    }
                    if (k0 == '\b' || k0 == '\x7F') {
                        if (this.eol && this.input.length > 0) {
                            this.input = this.input.substring(0, this.input.length - 1);
                            this.rubout();
                        }
                        else if (this.lines && this.line > 0 && !this.input.length) {
                            this.entry = this.input;
                            this.terminator = '[UP]';
                            process.stdin.pause();
                            break;
                        }
                        else
                            this.beep();
                        continue;
                    }
                    if (k0 == '\x15' || k0 == '\x18') {
                        this.rubout(this.input.length);
                        this.input = '';
                        continue;
                    }
                    if (k0 < ' ') {
                        let cook = 1;
                        this.terminator = `^${String.fromCharCode(k0.charCodeAt(0) + 64)}`;
                        if (k0 == '\x1B') {
                            cook = 3;
                            switch (k.substring(1)) {
                                case '[A':
                                    this.terminator = '[UP]';
                                    break;
                                case '[B':
                                    this.terminator = '[DOWN]';
                                    break;
                                case '[C':
                                    this.terminator = '[RIGHT]';
                                    break;
                                case '[D':
                                    this.terminator = '[LEFT]';
                                    break;
                                case '[11~':
                                    cook++;
                                case '[1P':
                                    cook++;
                                case 'OP':
                                    this.terminator = '[F1]';
                                    break;
                                case '[12~':
                                    cook++;
                                case '[1Q':
                                    cook++;
                                case 'OQ':
                                    this.terminator = '[F2]';
                                    break;
                                case '[13~':
                                    cook++;
                                case '[1R':
                                    cook++;
                                case 'OR':
                                    this.terminator = '[F3]';
                                    break;
                                case '[14~':
                                    cook++;
                                case '[1S':
                                    cook++;
                                case 'OS':
                                    this.terminator = '[F4]';
                                    break;
                                case '[15~':
                                    cook = 5;
                                    this.terminator = '[F5]';
                                    break;
                                case '[17~':
                                    cook = 5;
                                    this.terminator = '[F6]';
                                    break;
                                case '[18~':
                                    cook = 5;
                                    this.terminator = '[F7]';
                                    break;
                                case '[19~':
                                    cook = 5;
                                    this.terminator = '[F8]';
                                    break;
                                case '[20~':
                                    cook = 5;
                                    this.terminator = '[F9]';
                                    break;
                                case '[21~':
                                    cook = 5;
                                    this.terminator = '[F10]';
                                    break;
                                case '[23~':
                                    cook = 5;
                                    this.terminator = '[F11]';
                                    break;
                                case '[24~':
                                    cook = 5;
                                    this.terminator = '[F12]';
                                    break;
                                case '[1~':
                                case '[7~':
                                    cook++;
                                case '[H':
                                    this.terminator = '[HOME]';
                                    break;
                                case '[2~':
                                    cook++;
                                    this.terminator = '[INSERT]';
                                    break;
                                case '[3~':
                                    cook++;
                                    this.terminator = '[DELETE]';
                                    break;
                                case '[4~':
                                case '[8~':
                                    cook++;
                                case '[F':
                                    this.terminator = '[END]';
                                    break;
                                case '[5~':
                                    cook++;
                                    this.terminator = '[PGUP]';
                                    break;
                                case '[6~':
                                    cook++;
                                    this.terminator = '[PGDN]';
                                    break;
                                default:
                                    cook = 1;
                                    this.rubout(this.input.length);
                                    this.terminator = '[ESC]';
                                    this.input = this.cancel;
                                    if (this.echo)
                                        this.out(this.input);
                                    k0 = '';
                                    break;
                            }
                        }
                        if (k0 == '\r')
                            this.terminator = k0;
                        this.typeahead = k.substring(cook);
                        if (!this.input.length && this.enter.length > 0) {
                            this.input = this.enter;
                            if (this.echo)
                                this.out(this.input);
                        }
                        else if (this.input.length < this.entryMin) {
                            this.beep();
                            this.rubout(this.input.length);
                            this.input = '';
                            continue;
                        }
                        this.entry = this.input;
                        this.input = '';
                        process.stdin.pause();
                        break;
                    }
                    if (this.eol || this.lines) {
                        if (this.entryMax > 0 && this.input.length >= this.entryMax) {
                            this.beep();
                            if (this.lines && (this.line + 1) < this.lines) {
                                this.entry = this.input;
                                if (k0 !== ' ') {
                                    let i = this.input.lastIndexOf(' ');
                                    if (i > 0) {
                                        this.rubout(this.input.substring(i).length);
                                        this.entry = this.input.substring(0, i);
                                        this.typeahead = this.input.substring(i + 1) + k0 + this.typeahead;
                                    }
                                }
                                this.terminator = '\r';
                                process.stdin.pause();
                                break;
                            }
                            continue;
                        }
                    }
                    if (this.echo)
                        this.out(k0);
                    this.input += k0;
                    if (!this.eol && this.input.length >= this.entryMax) {
                        this.entry = this.input;
                        this.terminator = k0;
                        process.stdin.pause();
                        break;
                    }
                } while (this.typeahead);
            });
            process.stdin.on('pause', () => {
                if (this._waiting)
                    this._waiting();
            });
            process.stdin.on('resume', () => {
                if (this.typeahead)
                    process.stdin.emit('data', '');
                else
                    this.abort = false;
            });
            if (log)
                console.info(`xvt I/O initialized`);
        }
        else {
            if (log)
                console.warn(`xvt output only initialized`);
        }
    }
}
exports.xvt = xvt;
exports.default = xvt;
