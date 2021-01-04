# xvt

*an asynchronous terminal session handler*

xvt class an be initialized for either input & output or for output only

xvt input designed to work akin to a browser `<form>` element

xvt output supports your app's terminal emulator needs:

* `dumb` - plain ASCII
* `VT` - VT220 monochrome 7-bit controls
* `PC` - ANSI color typically used with IBM CP850 encoding
* `XT` - ANSI color used with UTF-8 encoding

```javascript
const emulation = [ 'dumb', 'VT', 'PC', 'XT' ]
for (let e in emulation) {
    xvt.app.emulation = emulation[e]
    xvt.outln(xvt.magenta, xvt.app.LGradient, xvt.reverse, emulation[e], ' BANNER', xvt.noreverse, xvt.app.RGradient)
    xvt.out(xvt.red,'R', xvt.green,'G', xvt.blue,'B')
    xvt.outln(xvt.reset, ' - ', xvt.bright, 'bold ', xvt.normal, 'normal ', xvt.blink, 'flash ', xvt.noblink, xvt.faint, 'dim')
}
```

## Demo

Check it out online where this is used to run a classic BBS: [Dank Domain](https://play.ddgame.us)

Or install it locally and run its demo from a shell:

```bash
$ npm install xvt
$ cd node_modules/xvt
$ npm run demo
```

## Example snippet

```javascript
import { io } from 'xvt'
const io = new xvt()

io.outln(io.clear, io.magenta, io.bright, 'Hello, world!')

io.form = {
    0: { cb: { io.focus = 'username' }, pause:true },
    'username': { cb: {
            const username = io.entry
            io.focus = 'password'
        }, prompt:'Username: ', min:3, max:10 },
    'password': { cb: password, echo:false, min:6, timeout:300 }
    1: { cb: fight, prompt: '<A>ttack, <C>ast a spell, or <R>etreat: ', enter:'a', eol:false, match:/A|C|R/i },
}
```

*Note:* form will autofocus if there is a field 0 defined in it.  Else, app sets form field focus manually.
