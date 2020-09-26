/// <reference types="node" />
declare module xvt {
    type emulator = string | 'dumb' | 'VT' | 'PC' | 'XT';
    interface Field {
        cb: Function;
        row?: number;
        col?: number;
        prompt?: string;
        promptStyle?: any[];
        inputStyle?: any[];
        cancel?: string;
        enter?: string;
        eraser?: string;
        min?: number;
        max?: number;
        match?: RegExp;
        echo?: boolean;
        enq?: boolean;
        eol?: boolean;
        lines?: number;
        pause?: boolean;
        timeout?: number;
    }
    interface iField {
        [key: string]: Field;
    }
    const romanize: any;
    const reset = 0;
    const bright = 1;
    const faint = 2;
    const uline = 4;
    const blink = 5;
    const reverse = 7;
    const off = 20;
    const nobright = 21;
    const normal = 22;
    const nouline = 24;
    const noblink = 25;
    const noreverse = 27;
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
    const lblack = 90;
    const lred = 91;
    const lgreen = 92;
    const lyellow = 93;
    const lblue = 94;
    const lmagenta = 95;
    const lcyan = 96;
    const lwhite = 97;
    const lBlack = 100;
    const lRed = 101;
    const lGreen = 102;
    const lYellow = 103;
    const lBlue = 104;
    const lMagenta = 105;
    const lCyan = 106;
    const lWhite = 107;
    const cll = 254;
    const clear = 255;
    class session {
        constructor(e?: emulator);
        private _emulation;
        private _encoding;
        private _fields;
        private _focus;
        get emulation(): emulator;
        set emulation(e: emulator);
        get encoding(): BufferEncoding;
        get LGradient(): any;
        get RGradient(): any;
        get Draw(): any;
        get Empty(): any;
        get form(): iField;
        set form(name: iField);
        get focus(): string | number;
        set focus(name: string | number);
        nofocus(keep?: boolean): void;
        refocus(prompt?: string): void;
        private _read;
    }
    let carrier: boolean;
    let modem: boolean;
    let ondrop: Function;
    let reason: string;
    let defaultColor: number;
    let defaultTimeout: number;
    let idleTimeout: number;
    let pollingMS: number;
    let sessionAllowed: number;
    let sessionStart: Date;
    let terminator: string;
    let typeahead: string;
    let entry: string;
    let app: session;
    let col: number;
    let color: number;
    let bold: boolean;
    let dim: boolean;
    let ul: boolean;
    let flash: boolean;
    let row: number;
    let rvs: boolean;
    function read(): Promise<void>;
    function wait(ms: number): Promise<unknown>;
    function waste(ms: number): void;
    function attr(...params: any[]): string;
    function beep(): void;
    function drain(): void;
    function hangup(): void;
    function out(...params: any[]): void;
    function outln(...params: any[]): void;
    function restore(): void;
    function save(): void;
    function plot(row: number, col: number): void;
    function rubout(n?: number): void;
}
export = xvt;
