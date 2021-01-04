interface Field {
    cb: Function;
    row?: number;
    col?: number;
    prompt?: string;
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
    delay?: number;
    timeout?: number;
    warn?: boolean;
}
interface iField {
    [key: string]: Field;
}
