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
	row?: number
	col?: number
	prompt?: string
	cb: Function
	enter?: string
	echo?: boolean
	eol?: boolean
	min?: number
	max?: number
	match?: RegExp
	pause?: boolean
    timeout?: number
}

export interface iField {
    [key: string]: Field
}

export interface Form {
	prompts: iField[]
}

export interface iForm {
	[key: string]: Form
}

export const validator = new Validator()

export class session {

    constructor () {
        if (process.stdin.isTTY)
            process.stdin.setRawMode(true)
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
            return
        }
        this._focus = name

        enter = validator.isDefined(p.enter) ? p.enter : ''
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
            out(reset, reverse, p.prompt, reset)
        }
        else {
            echo = validator.isDefined(p.echo) ? p.echo : true
            eol = validator.isDefined(p.eol) ? p.eol : true
            if (validator.isDefined(p.prompt))
                out(p.prompt)
        }

        if (!eol && !enter.length) enter = ' '

        this._read()
    }

    refocus() {
        this.focus = this.focus
    }

    private async _read() {
        let p = this._fields[this.focus]
        idleTimeout = validator.isDefined(p.timeout) ? p.timeout : defaultTimeout
        entryMin = validator.isDefined(p.min) ? p.min : 0
        entryMax = validator.isDefined(p.max) ? p.max : (eol ? 0 : 1)

        await read()

        if (validator.isDefined(p.match)) {
            if (!p.match.test(entry)) {
                this.refocus()
                return
            }
        }

        if (validator.isBoolean(p.pause))
            rubout(p.prompt.length)

        p.cb()
    }
}

export let app = new session()
export let modem = false

export let defaultTimeout: number = -1
export let idleTimeout: number
export let pollingMS: number = 100
export let sessionAllowed: number
export let sessionStart: Date = new Date()

export let entry: string = ''
export let enter: string = ''
export let cancel: string = ''
export let echo: boolean = true
export let eol: boolean = true
export let entryMin: number = 0
export let entryMax: number = 0

export async function read() {
    entry = ''
    let retry = idleTimeout

    for (; retry && !entry.length; retry--) {
        await wait(pollingMS)
        if (idleTimeout > 0 && idleTimeout / retry == 2) {
            beep()
        }
    }

    if (!retry) {
        out(' ** timeout **\n', reset)
        process.exit()
        //return new Promise(reject => 'timeout')
    }
}

export function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
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

export async function hangup() {
    if (modem) {
        out(reset, '+++')
        await wait(600)
        out('\nOK\n')
        await wait(300)
        out('ATH\n')
        await wait(600)
        beep()
        await wait(200)
        out('NO CARRIER\n')
        await wait(300)
    }
    process.exit()
}

export function out(...out) {
    process.stdout.write(attr(...out), emulation == 'XT' ? 'utf8' : 'ascii' )
}

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
const LGradient = {
    VT:'\x1B(0\x1B[2ma\x1B[ma\x1B[7m \x1B[1m \x1B[27m\x1B(B',
    PC:'\xB0\xB1\xB2\xDB',
    XT:'\u2591\u2592\u2593\u2588',
    dumb: ' :: '
}

//  █ ▓ ▒ ░ 
const RGradient = {
    VT:'\x1B(0\x1B[1;7m \x1B[21m \x1B[ma\x1B[2ma\x1B[m\x1B(B',
    PC:'\xDB\xB2\xB1\xB0',
    XT:'\u2588\u2593\u2592\u2591',
    dumb: ' :: '
}

//  ─ └ ┴ ┘ ├ ┼ ┤ ┌ ┬ ┐ │
const Draw = {
    VT: [ 'q', 'm', 'v', 'j', 't', 'n', 'u', 'l', 'w', 'k', 'x' ],
    PC: [ '\xC4', '\xC0', '\xC1', '\xD9', '\xC3', '\xC5', '\xB4', '\xDA', '\xC2', '\xBF', '\xB3' ],
    XT: [ '\u2500', '\u2514', '\u2534', '\u2518', '\u251C', '\u253C', '\u2524', '\u250C', '\u252C', '\u2510', '\u2502' ],
    dumb: [ '-', '+', '^', '+', '>', '+', '<', '+', 'v', '+', '|' ]
}

//  · 
const Empty = {
    VT: '\x1B(0\x7E\x1B(B',
    PC: '\xFA',
    XT: '\u00B7',
    dumb: '.'
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

export function rubout(n = 1, c = ' ') {
    for (let i = 0; i < n; i++)
        out('\x08', c, '\x08')
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

    //  rubout
    if (k == '\x08' || k == '\x7F') {
        if (eol && input.length > 0) {
            input = input.substr(0, input.length - 1)
            if (echo) rubout()
            return
        }
        else {
            beep()
            return
        }
    }

    //  ctrl-u or ctrl-x cancel typeahead
    if (k == '\x15' || k == '\x18') {
        if(echo) rubout(input.length)
        input = ''
        return
    }

    //  any text entry mode requires <CR> as the input line terminator
    if (k == '\x0D') {
        if (input.length < entryMin) {
            if (! echo) input = ''
            beep()
            return
        }
        if (!input.length && enter.length > 0) {
            input = enter
            if(echo) out(input)
        }
        entry = input
        input = ''
        return
    }

    //  eat other control keys
    if (k < ' ') {
        if (eol) return
        //  let's cook any cursor key event if not a line entry prompt
        if(k === '\x1B') {
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
            }
        }
        else {
            k = '^' + String.fromCharCode(64 + k.charCodeAt(0))
        }
        entry = k
        input = ''
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
        input = ''
    }
})

}

export = xvt
