interface Field {
    cb: Function        //  post-validated focus input (onblur)
    row?: number        //  1 - $LINES
    col?: number        //  1 - $COLUMNS
    prompt?: string     //  field description for user
    cancel?: string     //  return on ESC or timeout
    enter?: string      //  return on empty input
    eraser?: string     //  with echo, masking character to use
    min?: number        //  minimum input size
    max?: number        //  maximum input size
    match?: RegExp      //  validate input
    echo?: boolean      //  write what is read
    enq?: boolean       //  enquire terminal emulator characteristics
    eol?: boolean       //  requires user to terminate input
    lines?: number      //  multiple line entry
    pause?: boolean     //  press any key to continue
    delay?: number      //  in seconds, return enter
    timeout?: number    //  in seconds, return cancel or timeout exception
    warn?: boolean      //  send bell if entry timeout is halfway to expired
}

interface iField {
    [key: string]: Field
}
