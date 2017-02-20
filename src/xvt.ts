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

export const cll        = -2
export const clear      = -1
export const reset      =  0    // all attributes off, default color
export const bright     =  1
export const faint      =  2
export const uline      =  4
export const blink      =  5
export const reverse    =  7
export const off        = 20    //  turn any attribute on -> off, except color
export const nobright   = 21
export const nofaint    = 22
export const nouline    = 24
export const noblink    = 25
export const normal     = 27
export const black      = 30
export const red        = 31
export const green      = 32
export const yellow     = 33
export const blue       = 34
export const magenta    = 35
export const cyan       = 36
export const white      = 37
export const Black      = 40
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
    VT:'\x1B(0\x1B[1;7m \x1B[21m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
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
            out('\n?xvt form error, field undefined: "', name,'"\n')
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

        out(reset)
        let row = validator.isDefined(p.row) ? p.row : 0
        let col = validator.isDefined(p.col) ? p.col : 0
        if(row && col)
            plot(row, col)  //  formatted screen
        else
            out('\n')       //  roll-and-scroll

        if (validator.isBoolean(p.pause)) {
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

export let defaultTimeout: number = -1
export let idleTimeout: number = 0
export let pollingMS: number = 100
export let sessionAllowed: number = 0
export let sessionStart: Date = null
export let terminator: string = null

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

export let app = new session()

export async function read() {
    let retry = idleTimeout * (1000 / pollingMS)
    let warn = retry / 2
    entry = ''
    terminator = null

    while (carrier && --retry && validator.isEmpty(terminator)) {
        await wait(pollingMS)
        if (idleTimeout > 0 && retry == warn) beep()
        if (sessionAllowed > 0 && !(retry % pollingMS)) {
            let elapsed = (new Date().getTime() - sessionStart.getTime()) / 1000
            if (elapsed > sessionAllowed) carrier = false
        }
    }

    if (!carrier || !retry) {
        if (cancel.length) {
            rubout(input.length)
            entry = cancel
            out(entry)
        }
        else {
            beep()
            if (!carrier) out(' ** your session expired **\n', reset)
            if (!retry) out(' ** timeout **\n', reset)
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
    let start = new Date().getTime() + (ms)
    while (new Date().getTime() <= start) {}
}

export let color: number
export let bold: boolean
export let dark: boolean
export let ul: boolean
export let flash: boolean
export let rvs: boolean

//  ANSI using VT (DEC), PC (IBM), or XT (UTF-8) encoding, else dumb ASCII
export let emulation: string

export function attr(...out): string {
    out.forEach(data => {
        if (typeof data == 'number') {
            if (emulation != 'dumb') {
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
                    dark = false
                    ul = false
                    flash = false
                    rvs = false
                    break
                case bright:
                    if (dark) {    //  gnome-terminal wants this conflicting attribute off first
                        SGR(nofaint.toString())
                        dark = false
                        bold = false
                    }
                    if (! bold)
                        SGR(bright.toString())
                    bold = true
                    break
                case nobright:
                    if (bold)
                        SGR(nobright.toString())
                    bold = false
                    break
                case faint:
                    if (bold) {    //  gnome-terminal wants this conflicting attribute off first
                        SGR(nobright.toString())
                        bold = false
                        dark = false
                    }
                    if (! dark)
                        SGR(faint.toString())
                    dark = true
                    break
                case nofaint:
                    if (dark)
                        SGR(nofaint.toString())
                    dark = false
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
                case normal:
                    if (rvs)
                        SGR(normal.toString())
                    rvs = false
                    break
                case off:
                    if (bold)
                        SGR((off + bright).toString())
                    if (dark)
                        SGR((off + faint).toString())
                    if (ul)
                        SGR((off + uline).toString())
                    if (flash)
                        SGR((off + blink).toString())
                    if (rvs)
                        SGR((off + reverse).toString())
                    bold = false
                    dark = false
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
    if (modem) {
        out(reset, '+++')
        waste(500)
        out('\nOK\n')
        waste(250)
        out('ATH\n')
        waste(500)
        beep()
        waste(250)
        out('NO CARRIER\n')
        waste(500)
    }
    carrier = false
    process.exit()
}

export function out(...out) {
    process.stdout.write(attr(...out), emulation == 'XT' ? 'utf8' : 'ascii')
}

let _SGR: string = ''   //  Select Graphic Rendition
let _text: string = ''  //  buffer constructed emulation output(s)

function SGR(attr) {
    if (emulation != 'dumb') {
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
async function enquiry(ENQ: string) {
    input = ''
    echo = false
    eol = true
    out(ENQ)
    for (let retry = 5; retry && !input.length; retry--)
        await this.wait(100)
    entry = input
    console.log(input)
    input = ''
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
    hangup()
})

process.on('SIGINT', function () {
    out(' ** interrupt ** \n', reset)
    hangup()
})

//  capture VT user input
process.stdin.on('data', function(key: Buffer) {
    let k: string = key.toString(emulation == 'XT' ? 'utf8' : 'ascii', 0, 1)

    //  ctrl-d or ctrl-z to disconnect the session
    if (k == '\x04' || k == '\x1A') {
        out(' ** disconnect ** \n')
        hangup()
    }

    if (validator.isEmpty(app.focus) && !echo) return

    //  rubout
    if (k == '\x08' || k == '\x7F') {
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
    if (k == '\x15' || k == '\x18') {
        rubout(input.length)
        input = ''
        return
    }

    //  any text entry mode requires <CR> as the input line terminator
    if (k == '\x0D') {
        if (!input.length && enter.length > 0) {
            input = enter
            if(echo) out(input)
        }
        else if (input.length < entryMin) {
            if (! echo) input = ''
            beep()
            return
        }
        entry = input
        terminator = k
        return
    }

    //  eat other control keys
    if (k < ' ') {
        if (eol) {
            if (cancel.length) {
                rubout(input.length)
                entry = cancel
                out(entry)
            }
            else
                entry = input
            terminator = k
            return
        }
        //  let's cook for a special key event, if not prompting for a line of text
        if(k === '\x1B') {
            rubout(input.length)
            k = key.toString(emulation == 'XT' ? 'utf8' : 'ascii', 1, key.length)
            switch(k) {
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
        else {
            k = '^' + String.fromCharCode(64 + k.charCodeAt(0))
        }
        entry = input
        terminator = k
        return
    }

    //  don't exceed maximum input allowed
    if (entryMax > 0 && input.length >= entryMax) {
        beep()
        return
    }

    if (echo) out(k)
    input += k

    //  terminate entry if input size is met
    if (!eol && input.length >= entryMax) {
        entry = input
        terminator = k
    }
})

}

export = xvt
