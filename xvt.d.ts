/*****************************************************************************\
 *  XVT authored by: Robert Hurst <theflyingape@gmail.com>                   *
 *      an event-driven terminal session handler                             *
 *                                                                           *
 * - emulation interface: dumb, VT100, ANSI-PC, ANSI-UTF emulation           *
 * - user input interface: formatted and roll-and-scroll                     *
\*****************************************************************************/
import { Validator } from "class-validator";
declare module xvt {
    interface Field {
        cb: Function;
        row?: number;
        col?: number;
        prompt?: string;
        cancel?: string;
        enter?: string;
        echo?: boolean;
        eol?: boolean;
        eraser?: string;
        min?: number;
        max?: number;
        match?: RegExp;
        pause?: boolean;
        timeout?: number;
        inputStyle?: any[];
        promptStyle?: any[];
    }
    interface iField {
        [key: string]: Field;
    }
    const validator: Validator;
    const cll = -2;
    const clear = -1;
    const reset = 0;
    const bright = 1;
    const faint = 2;
    const uline = 4;
    const blink = 5;
    const reverse = 7;
    const off = 20;
    const nobright = 21;
    const nofaint = 22;
    const nouline = 24;
    const noblink = 25;
    const normal = 27;
    const black = 30;
    const red = 31;
    const green = 32;
    const yellow = 33;
    const blue = 34;
    const magenta = 35;
    const cyan = 36;
    const white = 37;
    const Black = 40;
    const Red = 41;
    const Green = 42;
    const Yellow = 43;
    const Blue = 44;
    const Magenta = 45;
    const Cyan = 46;
    const White = 47;
    const LGradient: {
        VT: string;
        PC: string;
        XT: string;
        dumb: string;
    };
    const RGradient: {
        VT: string;
        PC: string;
        XT: string;
        dumb: string;
    };
    const Draw: {
        VT: string[];
        PC: string[];
        XT: string[];
        dumb: string[];
    };
    const Empty: {
        VT: string;
        PC: string;
        XT: string;
        dumb: string;
    };
    class session {
        constructor();
        private _fields;
        private _focus;
        form: iField;
        focus: string | number;
        nofocus(keep?: boolean): void;
        refocus(): void;
        private _read();
    }
    let carrier: boolean;
    let modem: boolean;
    let defaultTimeout: number;
    let idleTimeout: number;
    let pollingMS: number;
    let sessionAllowed: number;
    let sessionStart: Date;
    let terminator: string;
    let entry: string;
    let enter: string;
    let cancel: string;
    let echo: boolean;
    let eol: boolean;
    let entryMin: number;
    let entryMax: number;
    let eraser: string;
    let defaultInputStyle: any;
    let defaultPromptStyle: any;
    let app: session;
    function read(): Promise<void>;
    function wait(ms: number): Promise<{}>;
    function waste(ms: number): void;
    let color: number;
    let bold: boolean;
    let dark: boolean;
    let ul: boolean;
    let flash: boolean;
    let rvs: boolean;
    let emulation: string;
    function attr(...out: any[]): string;
    function beep(): void;
    function hangup(): void;
    function out(...out: any[]): void;
    function plot(row: number, col: number): void;
    function rubout(n?: number): void;
}
export = xvt;
