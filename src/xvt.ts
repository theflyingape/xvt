/*****************************************************************************\
 *  XVT authored by: Robert Hurst <theflyingape@gmail.com>                   *
 *      an event-driven terminal session handler                             *
 *                                                                           *
 * - emulation interface: dumb, VT100, ANSI-PC, ANSI-UTF emulation           *
 * - user input interface: formatted and roll-and-scroll                     *
\*****************************************************************************/

import {Validator} from "class-validator"

module xvt {

export interface Field {
	cb: Function
	row?: number
	col?: number
    prompt?: string
    cancel?: string
    enter?: string
	echo?: boolean
	eol?: boolean
    eraser?: string
	min?: number
	max?: number
	match?: RegExp
	pause?: boolean
    timeout?: number
    inputStyle?: any[]
    promptStyle?: any[]
    enq?: boolean
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
export const validator = new Validator()
//  SGR (https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_.28Select_Graphic_Rendition.29_parameters)
export const cll        = -2
export const clear      = -1
export const reset      =  0    // all attributes off, default color
export const bright     =  1    // make brighter
export const faint      =  2    // make dimmer
export const uline      =  4
export const blink      =  5    //  not widely supported, unfortunately
export const reverse    =  7
export const off        = 20    //  turn any attribute on -> off, except color
export const nobright   = 21    //  not widely supported: cancels bold only
export const normal     = 22    //  cancels bold (really?) and faint
export const nouline    = 24
export const noblink    = 25
export const noreverse  = 27
export const black      = 30    //  foreground colors
export const red        = 31
export const green      = 32
export const yellow     = 33
export const blue       = 34
export const magenta    = 35
export const cyan       = 36
export const white      = 37
export const Black      = 40    //  background colors
export const Red        = 41
export const Green      = 42
export const Yellow     = 43
export const Blue       = 44
export const Magenta    = 45
export const Cyan       = 46
export const White      = 47

//  ░ ▒ ▓ █ 
export const LGradient = {
    VT:'\x1B(0\x1B[2ma\x1B[ma\x1B[7m \x1B[1m \x1B[27m\x1B(B',
    PC:'\xB0\xB1\xB2\xDB',
    XT:'\u2591\u2592\u2593\u2588',
    dumb: ' :: '
}

//  █ ▓ ▒ ░ 
export const RGradient = {
    VT:'\x1B(0\x1B[1;7m \x1B[22m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
    PC:'\xDB\xB2\xB1\xB0',
    XT:'\u2588\u2593\u2592\u2591',
    dumb: ' :: '
}

//  ─ └ ┴ ┘ ├ ┼ ┤ ┌ ┬ ┐ │
export const Draw = {
    VT: [ 'q', 'm', 'v', 'j', 't', 'n', 'u', 'l', 'w', 'k', 'x' ],
    PC: [ '\xC4', '\xC0', '\xC1', '\xD9', '\xC3', '\xC5', '\xB4', '\xDA', '\xC2', '\xBF', '\xB3' ],
    XT: [ '\u2500', '\u2514', '\u2534', '\u2518', '\u251C', '\u253C', '\u2524', '\u250C', '\u252C', '\u2510', '\u2502' ],
    dumb: [ '-', '+', '^', '+', '>', '+', '<', '+', 'v', '+', '|' ]
}

//  · 
export const Empty = {
    VT: '\x1B(0\x7E\x1B(B',
    PC: '\xFA',
    XT: '\u00B7',
    dumb: '.'
}

export class session {

    constructor () {
/*      const tty = require('tty')
        if (tty.isatty(0))
            tty.ReadStream(0).setRawMode(true)
*/
        if (process.stdin.isTTY)
            process.stdin.setRawMode(true)
        carrier = true
        sessionStart = new Date()
    }

    private _fields: iField
    private _focus: string|number

    get form() {
        return this._fields
    }

    set form(name: iField) {
        this._fields = name
    }

    get focus() { return this._focus }

    set focus(name: string|number) {
        let p = this._fields[name]
        if (!validator.isDefined(p)) {
            out('\n?xvt form error :: field "', name,'" undefined\n')
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

    refocus() {
        if (validator.isNotEmpty(this._focus)) this.focus = this.focus
    }

    private async _read() {
        let p = this._fields[this.focus]

        cancel = validator.isDefined(p.cancel) ? p.cancel : ''
        enter = validator.isDefined(p.enter) ? p.enter : ''

        if (p.enq) {
            enq = true
            out(p.prompt)
            idleTimeout = 2
            await read()
            enq = false
            p.cb()
            return
        }

        out(reset)
        let row = validator.isDefined(p.row) ? p.row : 0
        let col = validator.isDefined(p.col) ? p.col : 0
        if(row && col)
            plot(row, col)  //  formatted screen
        else
            out('\n')       //  roll-and-scroll

        if (p.pause) {
            echo = false
            eol = false
            if (!validator.isDefined(p.prompt)) p.prompt = '-pause-'
            out(reverse, p.prompt, reset)
        }
        else {
            echo = validator.isDefined(p.echo) ? p.echo : true
            eol = validator.isDefined(p.eol) ? p.eol : true

            if (!validator.isDefined(p.promptStyle)) p.promptStyle = defaultPromptStyle
            for (let n = 0; n < p.promptStyle.length; n++)
                out(p.promptStyle[n])

            if (validator.isDefined(p.prompt))
                out(p.prompt)

            if (!validator.isDefined(p.inputStyle)) p.inputStyle = defaultInputStyle
            for (let n = 0; n < p.inputStyle.length; n++)
                out(p.inputStyle[n])
        }

        if (!eol && !enter.length) enter = ' '

        idleTimeout = validator.isDefined(p.timeout) ? p.timeout : defaultTimeout
        entryMin = validator.isDefined(p.min) ? p.min : 0
        entryMax = validator.isDefined(p.max) ? p.max : (eol ? 0 : 1)
        eraser = validator.isDefined(p.eraser) ? p.eraser : ' '

        if(row && col && echo && entryMax) {
            for(let i = 0; i < entryMax; i++)
                out(eraser)
            for(let i = 0; i < entryMax; i++)
                out('\x08')
        }

        await read()

        if (validator.isDefined(p.match)) {
            if (!p.match.test(entry)) {
                this.refocus()
                return
            }
        }

        if (validator.isBoolean(p.pause)) {
            echo = true
            rubout(p.prompt.length)
        }

        out(reset)
        p.cb()
    }
}

export let carrier = false
export let modem = false
export let ondrop: Function
export let reason = ''

export let defaultTimeout: number = -1
export let idleTimeout: number = 0
export let pollingMS: number = 100
export let sessionAllowed: number = 0
export let sessionStart: Date = null
export let terminator: string = null
export let typeahead: string = ''

export let entry: string = ''
export let enter: string = ''
export let cancel: string = ''
export let echo: boolean = true
export let eol: boolean = true
export let entryMin: number = 0
export let entryMax: number = 0
export let eraser: string = ' '
export let defaultInputStyle: any = [ bright, white ]
export let defaultPromptStyle: any = [ cyan ]
export let enq: boolean = false

export let app = new session()

export async function read() {
    let retry = idleTimeout * (1000 / pollingMS) >>0
    let warn = retry >>1
    entry = ''
    terminator = null

    process.stdin.resume()
    while (carrier && retry && validator.isEmpty(terminator)) {
        if (typeahead) process.stdin.emit('data', '')
        else await wait(pollingMS)
        if (idleTimeout > 0 && --retry == warn) beep()
        if (sessionAllowed > 0 && !(retry % pollingMS)) {
            let elapsed = (new Date().getTime() - sessionStart.getTime()) / 1000
            if (elapsed > sessionAllowed) carrier = false
        }
    }

    if (!carrier || !retry) {
        //  any remaining cancel operations will take over, else bye-bye
        if (cancel.length) {
            rubout(input.length)
            entry = cancel
            out(entry)
        }
        else {
            beep()
            if (!carrier) {
                out(' ** your session expired **\n', reset)
                reason = 'got exhausted'
            }
            if (!retry) {
                out(' ** timeout **\n', reset)
                reason = 'fallen asleep'
            }
            waste(1000)
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
    entryMin = 0
    entryMax = 0
    eraser = ' '
    input = ''
}

export function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function waste(ms: number) {
    if (carrier) {
        let start = new Date().getTime() + (ms)
        while (new Date().getTime() <= start) {}
    }
}

//  SGR registers
export let color: number
export let bold: boolean
export let dim: boolean
export let ul: boolean
export let flash: boolean
export let rvs: boolean

//  ANSI using VT (DEC), PC (IBM), or XT (UTF-8) encoding, else dumb ASCII
export let emulation: string = 'XT'

export function attr(...out): string {
    out.forEach(data => {
        if (typeof data == 'number') {
            if (emulation !== 'dumb') {
                switch (data) {
                case cll:
                    text('\x1B[K')
                    break
                case clear:
                    text('\x1B[H\x1B[J')
                    break
                case reset:
                    SGR('0')
                    color = white
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
                    if (! bold)
                        SGR(bright.toString())
                    bold = true
                    break
                case faint:
                    if (bold) {    //  make bright/dim intensity mutually exclusive
                        SGR(normal.toString())
                        bold = false
                        dim = false
                    }
                    if (! dim)
                        SGR(faint.toString())
                    dim = true
                    break
                case nobright:
                    if (bold)
                        SGR(nobright.toString())
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
                    if (! ul)
                        SGR(uline.toString())
                    ul = true
                    break
                case nouline:
                    if (ul)
                        SGR(nouline.toString())
                    ul = false
                    break
                case blink:
                    if (! flash)
                        SGR(blink.toString())
                    flash = true
                    break
                case noblink:
                    if (flash)
                        SGR(noblink.toString())
                    flash = false
                    break
                case reverse:
                    if (! rvs)
                        SGR(reverse.toString())
                    rvs = true
                    break
                case noreverse:
                    if (rvs)
                        SGR(noreverse.toString())
                    rvs = false
                    break
                case off:
                    if (bold)
                        SGR((off + bright).toString())
                    if (dim)
                        SGR((off + faint).toString())
                    if (ul)
                        SGR((off + uline).toString())
                    if (flash)
                        SGR((off + blink).toString())
                    if (rvs)
                        SGR((off + reverse).toString())
                    bold = false
                    dim = false
                    ul = false
                    flash = false
                    rvs = false
                    break
                default:
                    color = data
                    if (data >= black && data <= white)
                        if (emulation !== 'VT')
                            SGR(data.toString())
                    if (data >= Black && data <= White) {
                        if (emulation !== 'VT')
                            SGR(data.toString())
                        else {
                            if (! rvs)
                                SGR(reverse.toString())
                            rvs = true
                        }
                    }
                    break
                }
            }
            else
                if (data == clear)
                    text('\f')
        }
        else
            text(data)
    })

    text('')
    let result = _text
    _text = ''
    return result
}

export function beep() {
        out('\x07')
}

export function hangup() {
    if (ondrop) ondrop()
    ondrop = null

    //  1.5-seconds of retro-fun  :)
    if (carrier && modem) {
        out(reset, '+++');      waste(500)
        out('\nOK\n');          waste(400)
        out('ATH\x0D');         waste(300)
        beep();                 waste(200)
        out('\nNO CARRIER\n');  waste(100)
    }

    carrier = false
    process.exit()
}

export function out(...out) {
    if (carrier)
        process.stdout.write(attr(...out), emulation == 'XT' ? 'utf8' : 'ascii')
}

let _SGR: string = ''   //  Select Graphic Rendition
let _text: string = ''  //  buffer constructed emulation output(s)

export function restore() {
    out(emulation == 'XT' ? '\x1B[u' : '\x1B8')
}

export function save() {
    out(emulation == 'XT' ? '\x1B[s' : '\x1B7')
}

function SGR(attr) {
    if (emulation !== 'dumb') {
        if (_SGR == '')
            _SGR = '\x1B['
        else
            attr = ';' + attr
        _SGR += attr
    }
}

function text(s) {
        if (_SGR.length) {
            _text += _SGR + 'm'
            _SGR = ''
        }
       _text += s
}

export function plot(row: number, col: number) {
    out('\x1B[', row.toString(), ';', col.toString(), 'H')
}

export function rubout(n = 1) {
    if (echo)
        for (let i = 0; i < n; i++)
            out('\x08', eraser, '\x08')
}

//  signal & stdin event handlers
let input: string = ''

process.on('SIGHUP', function () {
    out(' ** hangup ** \n', reset)
    reason = 'hangup'
    hangup()
})

process.on('SIGINT', function () {
    out(' ** interrupt ** \n', reset)
    reason = 'interrupted'
    hangup()
})

//  capture VT user input
process.stdin.on('data', function(key: Buffer) {
    let k: string
    let k0: string
    try {
        k = typeahead + key.toString(emulation == 'XT' ? 'utf8' : 'ascii')
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
        out(' ** disconnect ** \n')
        reason = 'manual disconnect'
        hangup()
    }

    //if (validator.isEmpty(app.focus) && !echo) return

    //  rubout
    if (k0 == '\x08' || k0 == '\x7F') {
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
        if (k0 === '\x1B') {
            rubout(input.length)
            switch (k.substr(1)) {
                case '[A':
                    k = '[UP]'
                    break
                case '[B':
                    k = '[DOWN]'
                    break
                case '[C':
                    k = '[RIGHT]'
                    break
                case '[D':
                    k = '[LEFT]'
                    break
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
                case '[3~':
                    k = '[DEL]'
                    break
                default:
                    k = '[ESC]'
                    break
            }
        }
        else
            k = '^' + String.fromCharCode(64 + k.charCodeAt(0))
        entry = input
        terminator = k
        process.stdin.pause()
	    return
    }

    if (k.length > 1)
        typeahead = k.substr(1)

    //  don't exceed maximum input allowed
    if (eol && entryMax > 0 && input.length >= entryMax) {
        beep()
        typeahead = ''
        return
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

}

export = xvt
