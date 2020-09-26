/*****************************************************************************\
 *  XVT authored by: Robert Hurst <theflyingape@gmail.com>                   *
 *      an asynchronous terminal session handler                             *
 *                                                                           *
 * - emulation interface: dumb, VT100, ANSI-PC, ANSI-UTF emulation           *
 * - user input interface: formatted and roll-and-scroll                     *
\*****************************************************************************/

const spawn = require('child_process')
import { isBoolean, isDefined, isEmpty, isNotEmpty, isString } from 'class-validator'
import { type } from 'os'

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
        timeout?: number
    }

    export interface iField {
        [key: string]: Field
    }
    /*
    export interface Form {
        prompts: iField[]
    }

    export interface iForm {
        [key: string]: Form
    }
    */
    export const romanize = require('romanize')
    //  SGR (https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_.28Select_Graphic_Rendition.29_parameters)
    export const reset = 0      // all attributes off, default color
    export const bright = 1     // make brighter
    export const faint = 2      // make dimmer
    export const uline = 4
    export const blink = 5      //  not widely supported, unfortunately
    export const reverse = 7
    export const off = 20       //  turn any attribute on -> off, except color
    export const nobright = 21  //  not widely supported: cancels bold only
    export const normal = 22    //  cancels bold (really?) and faint
    export const nouline = 24
    export const noblink = 25
    export const noreverse = 27
    export const black = 30     //  foreground colors
    export const red = 31
    export const green = 32
    export const yellow = 33
    export const blue = 34
    export const magenta = 35
    export const cyan = 36
    export const white = 37
    export const Black = 40     //  background colors
    export const Red = 41
    export const Green = 42
    export const Yellow = 43
    export const Blue = 44
    export const Magenta = 45
    export const Cyan = 46
    export const White = 47
    export const lblack = 90    //  lighter foreground colors
    export const lred = 91
    export const lgreen = 92
    export const lyellow = 93
    export const lblue = 94
    export const lmagenta = 95
    export const lcyan = 96
    export const lwhite = 97
    export const lBlack = 100   //  lighter background colors
    export const lRed = 101
    export const lGreen = 102
    export const lYellow = 103
    export const lBlue = 104
    export const lMagenta = 105
    export const lCyan = 106
    export const lWhite = 107
    export const cll = 254
    export const clear = 255

    export class session {

        constructor(e: emulator = 'XT') {
            carrier = true
            //const tty = require('tty')
            //if (tty.isatty(0)) tty.ReadStream(0).setRawMode(true)
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

        get focus() { return this._focus }

        set focus(name: string | number) {
            let p = this._fields[name]
            if (!isDefined(p)) {
                beep()
                outln(off, bright, '?ERROR in xvt.app.form :: field "', name, '" undefined')
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

        private async _read() {
            let p = this._fields[this.focus]

            cancel = isDefined(p.cancel) ? p.cancel : ''
            enter = isDefined(p.enter) ? p.enter : ''

            if (p.enq) {
                enq = true
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
                echo = false
                eol = false
                if (!isDefined(p.prompt)) p.prompt = '-pause-'
                out('\r', reverse, p.prompt, reset)
                abort = true
            }
            else {
                echo = isDefined(p.echo) ? p.echo : true
                eol = isDefined(p.eol) ? p.eol : true

                if (!isDefined(p.promptStyle)) p.promptStyle = defaultPromptStyle
                out(...p.promptStyle)
                if (isDefined(p.prompt)) out(p.prompt)

                lines = isDefined(p.lines) ? p.lines : 0
                if (lines) {
                    line = 0
                    outln()
                    out(bright, (line + 1).toString(), normal, '/', lines.toString(), faint, '] ', normal)
                    multi = []
                }

                if (!isDefined(p.inputStyle)) p.inputStyle = defaultInputStyle
                out(...p.inputStyle)
            }

            if (!eol && !enter.length) enter = ' '

            idleTimeout = isDefined(p.timeout) ? p.timeout : defaultTimeout
            entryMin = isDefined(p.min) ? p.min : 0
            entryMax = isDefined(p.max) ? p.max : (lines ? 72 : eol ? 0 : 1)
            eraser = isDefined(p.eraser) ? p.eraser : ' '

            if (row && col && echo && entryMax)
                out(eraser.repeat(entryMax), '\b'.repeat(entryMax))

            await read()
            out(reset)

            if (isDefined(p.match)) {
                if (!p.match.test(entry)) {
                    abort = true
                    this.refocus()
                    return
                }
            }

            while (lines && line < lines) {
                outln()
                if (entry.length) multi[line++] = entry
                if (entry.length && line < lines) {
                    out(bright, (line + 1).toString(), normal, '/', lines.toString(), faint, '] ', normal)
                    out(...p.inputStyle)
                    await read()
                    out(reset)
                }
                else {
                    entry = multi.join('\n')
                    lines = 0
                }
            }

            if (isBoolean(p.pause)) {
                echo = true
                out('\r', cll)
            }

            p.cb()
        }
    }

    export let carrier = false
    export let modem = false
    export let ondrop: Function
    export let reason = ''

    export let defaultColor: number = white
    export let defaultTimeout: number = -1
    export let idleTimeout: number = 0
    export let pollingMS: number = 50
    export let sessionAllowed: number = 0
    export let sessionStart: Date = null
    export let terminator: string = null
    export let typeahead: string = ''
    export let entry: string = ''

    export let app = new session()

    //  SGR registers
    export let col: number = 0
    export let color: number
    export let bold: boolean
    export let dim: boolean
    export let ul: boolean
    export let flash: boolean
    export let row: number = 0
    export let rvs: boolean

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

    //  drain any input typeahead
    let abort = false

    export async function read() {
        let between = pollingMS
        let elapsed = new Date().getTime() / 1000 >> 0
        let retry = elapsed + (idleTimeout >> 1)
        let warn = true
        entry = ''
        terminator = null

        try {
            while (carrier && retry && isEmpty(terminator)) {
                if (process.stdin.isPaused) {
                    process.stdin.resume()
                    between = 1
                }
                if (between) {
                    await wait(between)
                    between = pollingMS * 10
                }
                else
                    between = pollingMS
                elapsed = new Date().getTime() / 1000 >> 0
                if (idleTimeout > 0) {
                    if (retry <= elapsed) {
                        beep()
                        if (warn) {
                            retry = elapsed + (idleTimeout >> 1)
                            warn = false
                        }
                        else
                            retry = 0
                    }
                }
                else if (sessionAllowed && (elapsed - (sessionStart.getTime() / 1000)) > sessionAllowed)
                    carrier = false
            }
        }
        catch (err) {
            carrier = false
        }

        if (!carrier || !retry) {
            //  any remaining cancel operations will take over, else bye-bye
            if (cancel.length) {
                rubout(input.length)
                entry = cancel
                out(entry)
            }
            else {
                if (!carrier) {
                    process.stdout.write(attr(off, ' ** ', bright, 'your session expired', off, ' ** \r'))
                    reason = 'got exhausted'
                }
                else if (!retry) {
                    outln(off, ' ** ', faint, 'timeout', off, ' ** \r')
                    reason = 'fallen asleep'
                }
                beep()
                hangup()
            }
            //return new Promise(reject => 'timeout')
        }

        if (cancel.length && terminator === '\x1B') {
            rubout(input.length)
            entry = cancel
            out(entry)
        }

        //  sanity resets back to default stdin processing
        echo = true
        eol = true
        input = ''
    }

    export function wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    export function waste(ms: number) {
        if (carrier) {
            //let start = new Date().getTime() + (ms)
            //while (new Date().getTime() <= start) {}
            spawn.execSync(`sleep ${ms / 1000}`)
        }
    }

    export function attr(...params): string {
        let result = ''
        params.forEach(data => {
            if (typeof data == 'number') {
                if (data < 0) {
                    text()
                    result = _text
                    _text = ''
                    out(result)
                    waste(-data)
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
    }

    export function hangup() {
        if (ondrop) ondrop()
        ondrop = null

        //  1.5-seconds of retro-fun  :)
        if (carrier && modem) {
            out(off, '+++'); waste(500)
            outln('\nOK'); waste(400)
            out('ATH\r'); waste(300)
            beep(); waste(200)
            outln('\nNO CARRIER'); waste(100)
        }

        carrier = false
        process.exit()
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

    export function rubout(n = 1) {
        if (echo) {
            out(`\b${eraser}\b`.repeat(n))
            col -= n
        }
    }

    //  signal & stdin event handlers
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

    process.on('SIGHUP', function () {
        outln(off, ' ** ', faint, 'hangup', off, ' ** ')
        reason = 'hangup'
        carrier = false
        hangup()
    })

    process.on('SIGINT', function () {
        outln(off, ' ** ', bright, 'interrupt', off, ' ** ')
        reason = 'interrupted'
        carrier = false
        hangup()
    })

    //  capture VT user input
    process.stdin.on('data', (key: Buffer) => {
        let k: string
        let k0: string
        try {
            k = typeahead + key.toString()
            k0 = k.substr(0, 1)
            typeahead = ''
        }
        catch (err) {
            console.log(k, k.split('').map((c) => { return c.charCodeAt(0) }))
            return
        }

        // special ENQUIRY result
        if (enq) {
            entry = k
            terminator = k0
            process.stdin.pause()
            return
        }

        //  ctrl-d or ctrl-z to disconnect the session
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
                return
            }
            else {
                beep()
                return
            }
        }

        //  ctrl-u or ctrl-x cancel typeahead
        if (k0 == '\x15' || k0 == '\x18') {
            rubout(input.length)
            input = ''
            typeahead = ''
            return
        }

        //  any text entry mode requires <CR> as the input line terminator
        if (k0 == '\x0D') {
            if (!input.length && enter.length > 0) {
                input = enter
                if (echo) out(input)
            }
            else if (input.length < entryMin) {
                if (!echo) input = ''
                beep()
                return
            }
            entry = input
            terminator = k0
            process.stdin.pause()
            if (k.length > 1)
                typeahead = k.substr(1)
            return
        }

        //  eat other control keys
        if (k0 < ' ') {
            if (eol) {
                if (cancel.length) {
                    rubout(input.length)
                    entry = cancel
                    out(entry)
                }
                else
                    entry = input
                terminator = k
                process.stdin.pause()
                return
            }
            //  let's cook for a special key event, if not prompting for a line of text
            if (k0 == '\x1B') {
                rubout(input.length)
                if (k.startsWith('\x1B[A')) {
                    typeahead = k.substr(3)
                    k = '[UP]'
                }
                else if (k.startsWith('\x1B[B')) {
                    typeahead = k.substr(3)
                    k = '[DOWN]'
                }
                else if (k.startsWith('\x1B[C')) {
                    typeahead = k.substr(3)
                    k = '[RIGHT]'
                }
                else if (k.startsWith('\x1B[D')) {
                    typeahead = k.substr(3)
                    k = '[LEFT]'
                }
                else if (k.startsWith('\x1B[3~')) {
                    typeahead = k.substr(4)
                    k = '[DEL]'
                }
                else switch (k.substr(1)) {
                    case 'OP':
                    case '[11~':
                        k = '[F1]'
                        break
                    case 'OQ':
                    case '[12~':
                        k = '[F2]'
                        break
                    case 'OR':
                    case '[13~':
                        k = '[F3]'
                        break
                    case 'OS':
                    case '[14~':
                        k = '[F4]'
                        break
                    case '[15~':
                        k = '[F5]'
                        break
                    case '[17~':
                        k = '[F6]'
                        break
                    case '[18~':
                        k = '[F7]'
                        break
                    case '[19~':
                        k = '[F8]'
                        break
                    case '[20~':
                        k = '[F9]'
                        break
                    case '[21~':
                        k = '[F10]'
                        break
                    case '[23~':
                        k = '[F11]'
                        break
                    case '[24~':
                        k = '[F12]'
                        break
                    case '[H':
                        k = '[HOME]'
                        break
                    case '[F':
                        k = '[END]'
                        break
                    case '[2~':
                        k = '[INS]'
                        break
                    default:
                        typeahead = k.substr(1)
                        k = '[ESC]'
                        break
                }
            }
            else
                k = '^' + k0
            entry = input
            terminator = k
            process.stdin.pause()
            return
        }

        if (k.length > 1)
            typeahead = k.substr(1)

        if (eol || lines) {
            //  don't exceed maximum input allowed
            if (entryMax > 0 && input.length >= entryMax) {
                beep()
                if (lines && (line + 1) < lines) {
                    entry = input
                    terminator = k0
                    //  word-wrap if this entry will overflow into next line
                    if (k0 !== ' ') {
                        let i = input.lastIndexOf(' ')
                        if (i > 0) {
                            rubout(input.substring(i).length)
                            entry = input.substring(0, i)
                            typeahead = input.substring(i + 1) + k0 + typeahead
                        }
                    }
                    process.stdin.pause()
                }
                else
                    typeahead = ''
                return
            }
            if (typeahead.length)
                process.stdin.pause()
        }

        if (echo) out(k0)
        input += k0

        //  terminate entry if input size is met
        if (!eol && input.length >= entryMax) {
            entry = input
            terminator = k0
            process.stdin.pause()
        }
    })

    process.stdin.on('resume', () => {
        //  abort any input pending
        if (abort) {
            abort = false
            typeahead = ''
        }
        if (typeahead)
            process.stdin.emit('data', '')
    })

}

export = xvt
