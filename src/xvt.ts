/*****************************************************************************\
 *  XVT authored by: Robert Hurst <theflyingape@gmail.com>                   *
 *      an asynchronous terminal session handler                             *
 *                                                                           *
 * - emulation interface: dumb, VT100, ANSI-PC, ANSI-UTF emulation           *
 * - user input interface: formatted and roll-and-scroll                     *
\*****************************************************************************/

const spawn = require('child_process')
import { isBoolean, isDefined, isEmpty, isNotEmpty, isString } from 'class-validator'

module xvt {

    export type emulator = string | 'dumb' | 'VT' | 'PC' | 'XT'

    export interface Field {
        cb: Function
        row?: number
        col?: number
        prompt?: string
        promptStyle?: any[] //  attr() parameters for prompt
        inputStyle?: any[]  //  attr() parameters for input
        cancel?: string     //  return on ESC or timeout
        enter?: string      //  return on empty input
        eraser?: string     //  with echo, masking character to use
        min?: number        //  minimum input size
        max?: number        //  maximum input size
        match?: RegExp      //  validate input
        echo?: boolean
        enq?: boolean       //  enquire terminal emulator characteristics
        eol?: boolean       //  requires user to terminate input
        lines?: number      //  multiple line entry
        pause?: boolean     //  press any key to continue
        timeout?: number    //  in seconds
        warn?: boolean      //  send bell if entry timeout is halfway to expired
    }

    export interface iField {
        [key: string]: Field
    }

    //  [SGR](https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_.28Select_Graphic_Rendition.29_parameters)
    export const reset      =   0   // all attributes off, default color
    export const bright     =   1   // make brighter
    export const faint      =   2   // make dimmer
    export const uline      =   4
    export const blink      =   5   //  not widely supported, unfortunately
    export const reverse    =   7
    export const off        =  20   //  turn any attribute on -> off, except color
    export const nobright   =  21   //  not widely supported: cancels bold only
    export const normal     =  22   //  cancels bold (really?) and faint
    export const nouline    =  24
    export const noblink    =  25
    export const noreverse  =  27
    export const black      =  30   //  foreground colors
    export const red        =  31
    export const green      =  32
    export const yellow     =  33
    export const blue       =  34
    export const magenta    =  35
    export const cyan       =  36
    export const white      =  37
    export const Black      =  40   //  background colors
    export const Red        =  41
    export const Green      =  42
    export const Yellow     =  43
    export const Blue       =  44
    export const Magenta    =  45
    export const Cyan       =  46
    export const White      =  47
    export const lblack     =  90   //  lighter foreground colors
    export const lred       =  91
    export const lgreen     =  92
    export const lyellow    =  93
    export const lblue      =  94
    export const lmagenta   =  95
    export const lcyan      =  96
    export const lwhite     =  97
    export const lBlack     = 100   //  lighter background colors
    export const lRed       = 101
    export const lGreen     = 102
    export const lYellow    = 103
    export const lBlue      = 104
    export const lMagenta   = 105
    export const lCyan      = 106
    export const lWhite     = 107
    export const cll        = 254
    export const clear      = 255

    //  application terminal session runtime variables
    export let carrier = false
    export let modem = false
    export let ondrop: Function
    export let reason = ''

    export let defaultColor: number = white
    export let defaultTimeout: number = 0
    export let defaultWarn: boolean = true
    export let entry: string = ''
    export let idleTimeout: number = 0
    export let sessionAllowed: number = 0
    export let sessionStart: Date = null
    export let terminator: string = null
    export let typeahead: string = ''
    export let waiting: Function

    //  session support functions
    export function hangup() {
        if (ondrop) ondrop()
        ondrop = null

        //  1.5-seconds of retro-fun  :)
        if (carrier && modem) {
            out(off, '+', -125, '+', -125, '+', -250)
            outln('\nOK')
            out(-400, 'ATH\r', -300)
            beep()
            outln('\n', -200, 'NO CARRIER')
            sleep(100)
        }

        carrier = false
        process.exit()
    }

    export function sleep(ms: number) {
        if (ms > 0) {
            ms += 10    //  pad for spawn() overhead
            const t = ms > 20 ? ms - 20 : 0
            if (carrier) try {
                spawn.execSync(`sleep ${t / 1000}`, { stdio:'ignore', timeout:ms })
            }
            catch(err) {}
        }
    }


    //  the terminal session with optional form(s) support
    export class session {

        constructor(e: emulator = 'XT') {
            carrier = true
            if (process.stdin.isTTY) process.stdin.setRawMode(true)
            this.emulation = e
            sessionStart = new Date()
        }

        //  ANSI using VT (DEC), PC (IBM), or XT (UTF-8) encoding, else dumb ASCII
        private _emulation: emulator
        private _encoding: BufferEncoding
        private _fields: iField
        private _focus: string | number

        get emulation() {
            return this._emulation
        }

        set emulation(e: emulator) {
            this._encoding = e == 'XT' ? 'utf8' : 'ascii'
            process.stdin.setEncoding(this.encoding)
            process.stdout.setEncoding(this.encoding)
            this._emulation = e
        }

        get encoding(): BufferEncoding {
            return this._encoding
        }

        //  ░ ▒ ▓ █
        get LGradient() {
            return {
                VT: '\x1B(0\x1B[2ma\x1B[ma\x1B[7m \x1B[1m \x1B[27m\x1B(B',
                PC: '\xB0\xB1\xB2\xDB',
                XT: '\u2591\u2592\u2593\u2588',
                dumb: ' :: '
            }[this._emulation]
        }

        //  █ ▓ ▒ ░
        get RGradient() {
            return {
                VT: '\x1B(0\x1B[1;7m \x1B[22m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
                PC: '\xDB\xB2\xB1\xB0',
                XT: '\u2588\u2593\u2592\u2591',
                dumb: ' :: '
            }[this._emulation]
        }

        //  ─ └ ┴ ┘ ├ ┼ ┤ ┌ ┬ ┐ │
        get Draw() {
            return {
                VT: ['q', 'm', 'v', 'j', 't', 'n', 'u', 'l', 'w', 'k', 'x'],
                PC: ['\xC4', '\xC0', '\xC1', '\xD9', '\xC3', '\xC5', '\xB4', '\xDA', '\xC2', '\xBF', '\xB3'],
                XT: ['\u2500', '\u2514', '\u2534', '\u2518', '\u251C', '\u253C', '\u2524', '\u250C', '\u252C', '\u2510', '\u2502'],
                dumb: ['-', '+', '^', '+', '>', '+', '<', '+', 'v', '+', '|']
            }[this._emulation]
        }

        //  ·
        get Empty() {
            return {
                VT: '\x1B(0\x7E\x1B(B',
                PC: '\xFA',
                XT: '\u00B7',
                dumb: '.'
            }[this._emulation]
        }

        get form() {
            return this._fields
        }

        set form(name: iField) {
            this._fields = name
        }

        get focus() {
            return this._focus
        }

        set focus(name: string | number) {
            let p = this._fields[name]
            if (!isDefined(p)) {
                beep()
                outln(off, red, '?', bright, 'ERROR', defaultColor, ` in xvt.app.form :: field '${name}' undefined`)
                this.refocus()
                return
            }
            this._focus = name

            this._read()
        }

        nofocus(keep = false) {
            echo = keep
            entryMin = 0
            entryMax = 0
            eol = false
            this._focus = null
        }

        refocus(prompt?: string) {
            if (isDefined(prompt)) this._fields[this.focus].prompt = prompt
            if (isNotEmpty(this._focus)) this.focus = this.focus
        }

        //  terminal input prompt entry point upon "focus"
        private async _read() {
            let p = this._fields[this.focus]

            cancel = isDefined(p.cancel) ? p.cancel : ''
            enter = isDefined(p.enter) ? p.enter : ''
            input = ''

            if (p.enq) {
                enq = true
                warn = false
                out(p.prompt)
                idleTimeout = 5
                await read()
                enq = false
                p.cb()
                return
            }

            out(reset)
            let row = isDefined(p.row) ? p.row : 0
            let col = isDefined(p.col) ? p.col : 0
            if (row && col)
                plot(row, col)  //  formatted screen
            else
                outln()         //  roll-and-scroll

            if (p.pause) {
                cancel = ' '
                echo = false
                eol = false
                enter = ' '
                if (!isDefined(p.prompt)) p.prompt = '-pause-'
                out(reverse, p.prompt, reset)
                drain()
            }
            else {
                echo = isDefined(p.echo) ? p.echo : true
                eol = isDefined(p.eol) ? p.eol : true

                if (!isDefined(p.promptStyle)) p.promptStyle = defaultPromptStyle
                out(...p.promptStyle)
                if (isDefined(p.prompt)) out(p.prompt)

                lines = isDefined(p.lines) ? (p.lines > 1 ? p.lines : 2) : 0
                if (lines) {
                    eol = true
                    line = 0
                    outln()
                    out(bright, (line + 1).toString(), normal, '/', lines.toString(), faint, '] ', normal)
                    multi = []
                }

                if (!isDefined(p.inputStyle)) p.inputStyle = defaultInputStyle
                out(...p.inputStyle)
            }

            entryMin = isDefined(p.min) ? p.min : 0
            entryMax = isDefined(p.max) ? p.max : (lines ? 72 : eol ? 0 : 1)
            eraser = isDefined(p.eraser) ? p.eraser : ' '
            idleTimeout = isDefined(p.timeout) ? p.timeout : defaultTimeout
            warn = isDefined(p.warn) ? p.warn : defaultWarn

            if (row && col && echo && entryMax)
                out(eraser.repeat(entryMax), '\b'.repeat(entryMax))

            await read()

            if (isDefined(p.match)) {
                if (!p.match.test(entry)) {
                    drain()
                    this.refocus()
                    return
                }
            }

            if (isBoolean(p.pause)) rubout(7, true)

            if (lines) {
                do {
                    multi[line] = entry
                    if (terminator == '[UP]') {
                        if (line) {
                            out('\x1B[A')
                            line--
                        }
                        out('\r')
                    }
                    else {
                        outln()
                        line++
                        if (!entry.length || line == lines) {
                            for (let i = line; i < lines; i++) {
                                outln(cll)
                                delete multi[i]
                            }
                            break
                        }
                    }

                    out(bright, (line + 1).toString(), normal, '/', lines.toString(), faint, '] ', normal)
                    out(...p.inputStyle)
                    input = multi[line] || ''
                    out(input)

                    await read()
                } while (line < lines)
                entry = multi.join('\n')
                while(entry.substr(-1) == '\n')
                    entry = entry.substr(0, entry.length-1)
            }

            p.cb()
        }
    }


    //  ******************
    //  terminal emulation
    //  ******************

    //  SGR registers
    export let col: number = 0
    export let color: number
    export let bold: boolean
    export let dim: boolean
    export let ul: boolean
    export let flash: boolean
    export let row: number = 0
    export let rvs: boolean

    //  local runtime registers
    let _col: number = 0
    let _color: number = 0
    let _bold: boolean = false
    let _dim: boolean = false
    let _ul: boolean = false
    let _flash: boolean = false
    let _row: number = 0
    let _rvs: boolean = false
    let _SGR: string = ''   //  Select Graphic Rendition
    let _text: string = ''  //  buffer constructed emulation output(s)

    export function attr(...params): string {
        let result = ''
        params.forEach(data => {
            if (typeof data == 'number') {
                if (data < 0) {
                    text()
                    result = _text
                    _text = ''
                    out(result)
                    sleep(-data)
                }
                else if (app.emulation !== 'dumb') {
                    switch (data) {
                        case cll:
                            text('\x1B[K')
                            break
                        case clear:
                            text('\x1B[H\x1B[J')
                            row = 1
                            col = 1
                            break
                        case off:   //  force reset
                            color = defaultColor
                        case reset:
                            if (color || bold || dim || ul || flash || rvs) {
                                _SGR = ''
                                text('\x1B[m')
                            }
                            color = 0
                            bold = false
                            dim = false
                            ul = false
                            flash = false
                            rvs = false
                            break
                        case bright:
                            if (dim) {    //  make bright/dim intensity mutually exclusive
                                SGR(normal.toString())
                                bold = false
                                dim = false
                            }
                            if (!bold) {
                                SGR(bright.toString())
                                if (!color) {
                                    color = defaultColor
                                    SGR(color.toString())
                                }
                            }
                            bold = true
                            break
                        case faint:
                            if (bold) {    //  make bright/dim intensity mutually exclusive
                                SGR(normal.toString())
                                bold = false
                                dim = false
                            }
                            if (!dim) SGR(faint.toString())
                            dim = true
                            break
                        case nobright:
                            if (bold) SGR(nobright.toString())
                            bold = false
                            break
                        case normal:
                            if (bold || dim) {
                                SGR(normal.toString())
                                bold = false
                                dim = false
                            }
                            break
                        case uline:
                            if (!ul) SGR(uline.toString())
                            ul = true
                            break
                        case nouline:
                            if (ul) SGR(nouline.toString())
                            ul = false
                            break
                        case blink:
                            if (!flash) SGR(blink.toString())
                            flash = true
                            break
                        case noblink:
                            if (flash) SGR(noblink.toString())
                            flash = false
                            break
                        case reverse:
                            if (!rvs) SGR(reverse.toString())
                            rvs = true
                            break
                        case noreverse:
                            if (rvs) SGR(noreverse.toString())
                            rvs = false
                            break
                        default:
                            color = data
                            if (data >= black && data <= white || data >= lblack && data <= lwhite)
                                if (app.emulation !== 'VT') SGR(data.toString())
                            if (data >= Black && data <= White || data >= lBlack && data <= lWhite) {
                                if (app.emulation !== 'VT') SGR(data.toString())
                                else {
                                    if (!rvs) SGR(reverse.toString())
                                    rvs = true
                                }
                            }
                            break
                    }
                }
                else
                    if (data == clear) {
                        text('\f')
                        row = 1
                        col = 1
                    }
            }
            else {
                text(data)
                let lines = isString(data) ? data.split('\n') : []
                if (lines.length > 1) {
                    row += lines.length - 1
                    col = lines[lines.length - 1].length + 1
                }
            }
        })

        text()
        result = _text
        _text = ''
        return result
    }

    export function beep() {
        out('\x07')
    }

    export function drain() {
        abort = true
        typeahead = ''
    }

    export function out(...params) {
        try {
            if (carrier)
                process.stdout.write(attr(...params), app.encoding)
        }
        catch (err) {
            carrier = false
        }
    }

    export function outln(...params) {
        out(attr(...params), reset, '\n')
    }

    export function restore() {
        out(app.emulation == 'VT' ? '\x1B8' : '\x1B[u')
        col = _col
        color = _color
        bold = _bold
        dim = _dim
        ul = _ul
        flash = _flash
        row = _row
        rvs = _rvs
    }

    export function save() {
        out(app.emulation == 'VT' ? '\x1B7' : '\x1B[s')
        _col = col
        _color = color
        _bold = bold
        _dim = dim
        _ul = ul
        _flash = flash
        _row = row
        _rvs = rvs
    }

    function SGR(attr: string) {
        if (app.emulation !== 'dumb') {
            if (_SGR == '')
                _SGR = '\x1B['
            else
                attr = ';' + attr
            _SGR += attr
        }
    }

    function text(s = '') {
        if (_SGR.length) {
            _text += _SGR + 'm'
            _SGR = ''
        }
        _text += s
        col += s.length
    }

    export function plot(row: number, col: number) {
        out('\x1B[', row.toString(), ';', col.toString(), 'H')
        xvt.row = row
        xvt.col = col
    }

    export function rubout(n = 1, erase?: boolean) {
        if (!isDefined(erase)) erase = echo
        if (erase) {
            out(`\b${eraser}\b`.repeat(n))
            col -= n
        }
    }


    //  *********************
    //  session form(s) input
    //  *********************

    //  runtime field prompt registers
    let abort: boolean = false
    let cancel: string = ''
    let defaultInputStyle: any = [bright, white]
    let defaultPromptStyle: any = [cyan]
    let echo: boolean = true
    let enq: boolean = false
    let enter: string = ''
    let entryMin: number = 0
    let entryMax: number = 0
    let eol: boolean = true
    let eraser: string = ' '
    let input: string = ''
    let line: number = 0
    let lines: number = 0
    let multi: string[]
    let warn: boolean = defaultWarn

    export async function read() {
        const idle = idleTimeout ? idleTimeout * (warn ? 500 : 1000) : 2147483647
        let elapsed = new Date().getTime() / 1000 >> 0
        let retry = true
        entry = ''
        terminator = null

        if (carrier) {
            elapsed = new Date().getTime() / 1000 >> 0
            if (sessionAllowed && (elapsed - (sessionStart.getTime() / 1000)) > sessionAllowed) {
                outln(off, ' ** ', bright, 'your session expired', off, ' ** ')
                reason = reason || 'got exhausted'
                carrier = false
            }
        }

        while (carrier && retry && isEmpty(terminator)) {
            await forInput(idle).catch(() => {
                if (isEmpty(terminator) && retry && warn) {
                    beep()
                    retry = warn
                    warn = false
                }
                else
                    retry = false
            })
        }
        out(reset)

        if (!carrier || !retry) {
            //  any remaining cancel operations will take over, else bye-bye
            if (cancel.length)
                terminator = '[ESC]'
            else {
                if (!retry) {
                    outln(off, ' ** ', faint, 'timeout', off, ' ** ')
                    reason = reason || 'fallen asleep'
                }
                beep()
                hangup()
            }
        }

        if (cancel.length && terminator == '[ESC]') {
            rubout(input.length)
            entry = cancel
            out(entry)
            terminator = '\r'
        }

        function forInput(ms: number) {
            return new Promise((resolve, reject) => {
                waiting = () => { resolve(terminator) }
                if (process.stdin.isPaused) process.stdin.resume()
                setTimeout(reject, carrier ? ms : 0)
            }).finally(() => { waiting = null })
        }
    }

    //  capture VT user input
    process.stdin.on('data', (key: Buffer) => {

        do {
            let k = typeahead + (key ? key.toString() : '')
            typeahead = ''
            key = null
            let k0 = k.substr(0, 1)
            terminator = null

            if (abort) {
                abort = false
                break
            }

            // special ENQUIRY result
            if (enq) {
                let i = k.indexOf('\x1B')
                if (i >= 0)
                    entry = k.substr(i)
                else
                    entry = k
                terminator = k0
                process.stdin.pause()
                break
            }

            //  load input with any typeahead up to, but not including, the max (or control character)
            if (k.length > 1 && k0 >= ' ') {
                const t = (entryMax || k.length) - input.length
                if (t > 1) {
                    let load = k.substr(0, t - 1)
                    const m = /[\x00-\x1F]/.exec(load)
                    if (m && m.index) load = load.substr(0, m.index)
                    if (echo) out(load)
                    input += load
                    k = k.substr(load.length)
                    k0 = k.substr(0, 1)
                }
            }
            typeahead = k.substr(1)
            if (!k0) continue

            //  ctrl-d or ctrl-z disconnects session
            if (k0 == '\x04' || k0 == '\x1A') {
                outln(off, ' ** disconnect ** ')
                reason = 'manual disconnect'
                hangup()
            }

            //  rubout / delete
            if (k0 == '\b' || k0 == '\x7F') {
                if (eol && input.length > 0) {
                    input = input.substr(0, input.length - 1)
                    rubout()
                }
                else if (lines && line > 0 && !input.length) {
                    entry = input
                    terminator = '[UP]'
                    process.stdin.pause()
                    break
                }
                else
                    beep()
                continue
            }

            //  ctrl-u or ctrl-x cancel typeahead
            if (k0 == '\x15' || k0 == '\x18') {
                rubout(input.length)
                input = ''
                continue
            }

            //  eat control keys
            if (k0 < ' ') {
                //  let's cook for a special key event
                let cook = 1
                terminator = `^${String.fromCharCode(k0.charCodeAt(0) + 64)}`
                if (k0 == '\x1B') {
                    cook = 3
                    switch (k.substr(1)) {
                        case '[A':
                            terminator = '[UP]'
                            break
                        case '[B':
                            terminator = '[DOWN]'
                            break
                        case '[C':
                            terminator = '[RIGHT]'
                            break
                        case '[D':
                            terminator = '[LEFT]'
                            break
                        case '[11~':
                            cook++
                        case '[1P':
                            cook++
                        case 'OP':
                            terminator = '[F1]'
                            break
                        case '[12~':
                            cook++
                        case '[1Q':
                            cook++
                        case 'OQ':
                            terminator = '[F2]'
                            break
                        case '[13~':
                            cook++
                        case '[1R':
                            cook++
                        case 'OR':
                            terminator = '[F3]'
                            break
                        case '[14~':
                            cook++
                        case '[1S':
                            cook++
                        case 'OS':
                            terminator = '[F4]'
                            break
                        case '[15~':
                            cook = 5
                            terminator = '[F5]'
                            break
                        case '[17~':
                            cook = 5
                            terminator = '[F6]'
                            break
                        case '[18~':
                            cook = 5
                            terminator = '[F7]'
                            break
                        case '[19~':
                            cook = 5
                            terminator = '[F8]'
                            break
                        case '[20~':
                            cook = 5
                            terminator = '[F9]'
                            break
                        case '[21~':
                            cook = 5
                            terminator = '[F10]'
                            break
                        case '[23~':
                            cook = 5
                            terminator = '[F11]'
                            break
                        case '[24~':
                            cook = 5
                            terminator = '[F12]'
                            break
                        case '[1~':
                        case '[7~':
                            cook++
                        case '[H':
                            terminator = '[HOME]'
                            break
                        case '[2~':
                            cook++
                            terminator = '[INSERT]'
                            break
                        case '[3~':
                            cook++
                            terminator = '[DELETE]'
                            break
                        case '[4~':
                        case '[8~':
                            cook++
                        case '[F':
                            terminator = '[END]'
                            break
                        case '[5~':
                            cook++
                            terminator = '[PGUP]'
                            break
                        case '[6~':
                            cook++
                            terminator = '[PGDN]'
                            break
                        default:
                            cook = 1
                            terminator = '[ESC]'
                            break
                    }
                }
                if (k0 == '\r')
                    terminator = k0

                typeahead = k.substr(cook)

                if (!input.length && enter.length > 0) {
                    input = enter
                    if (echo) out(input)
                }
                else if (input.length < entryMin) {
                    beep()
                    rubout(input.length)
                    input = ''
                    continue
                }

                entry = input
                input = ''
                process.stdin.pause()
                break
            }

            //  line mode input
            if (eol || lines) {
                //  don't exceed maximum input allowed
                if (entryMax > 0 && input.length >= entryMax) {
                    beep()
                    if (lines && (line + 1) < lines) {
                        entry = input
                        //  word-wrap if this entry will overflow into next line
                        if (k0 !== ' ') {
                            let i = input.lastIndexOf(' ')
                            if (i > 0) {
                                rubout(input.substring(i).length)
                                entry = input.substring(0, i)
                                typeahead = input.substring(i + 1) + k0 + typeahead
                            }
                        }
                        terminator = '\r'
                        process.stdin.pause()
                        break
                    }
                    continue
                }
            }

            //  character mode input
            if (echo) out(k0)
            input += k0

            //  terminate entry if input size is met
            if (!eol && input.length >= entryMax) {
                entry = input
                terminator = k0
                process.stdin.pause()
                break
            }
        } while (typeahead)
    })


    //  *****************************
    //  signal & stdin event handlers
    //  *****************************
    process.on('SIGHUP', function () {
        outln(off, ' ** ', faint, 'hangup', off, ' ** ')
        reason = reason || 'hangup'
        carrier = false
        hangup()
    })

    process.on('SIGINT', function () {
        outln(off, ' ** ', bright, 'interrupt', off, ' ** ')
        reason = reason || 'interrupted'
        carrier = false
        hangup()
    })

    //  resolve forInput() promise
    process.stdin.on('pause', () => {
        if (waiting) waiting()
    })

    //  make stdin immediately aware of any input pending
    process.stdin.on('resume', () => {
        if (typeahead)
            process.stdin.emit('data', '')
        else
            abort = false
    })


    //  instantiate the runtime terminal session
    export let app = new session()
}

export = xvt
