const lrcTimeExp = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g
const trimExp = /(^\s*|\s*$)/m
const songReg = {
  title: 'ti',
  artist: 'ar',
  album: 'al',
  offset: 'offset',
  by: 'by'
}

export class LrcSync {
  constructor (lrc, cbHandler) {
    this.lrc = lrc.replace(trimExp, '')
    this.cbHandler = cbHandler || function () {}
    this.info = {}
    this.lrcRow = []
    this.state = 0 // 0: stop, 1: playing
    this.__init__()
  }

  __init__ () {
    for (var label in songReg) {
      const result = this.lrc.match(new RegExp(`\\[${songReg[label]}:([^\\]]*)]`, 'i'))
      this.info[label] = (result && result[1]) || ''
    }

    const lrcRow = this.lrc.split('\n')
    for (var i = 0; i < lrcRow.length; i++) {
      let result = lrcTimeExp.exec(lrcRow[i])
      if (result) {
        const text = lrcRow[i].replace(lrcTimeExp, '').replace(trimExp, '')
        if (text) {
          this.lrcRow.push({
            time: result[1] * 60 * 1000 + result[2] * 1000 + (result[3] || 0) * 10,
            text
          })
        }
      }
    }
    this.lrcRow.sort((a, b) => {
      return a.time - b.time
    })
  }
  play (start = 0, skipPrev) {
    if (!this.lrcRow.length) return
    this.state = 1
    this._stamp = Date.now() - start
    this.currentNum = this.__currentLrcRow(start)
    if (!skipPrev) {
      this.currentNum && this.__linkCbHandler(this.currentNum - 1)
    }
    if (this.currentNum < this.lrcRow.length) {
      clearTimeout(this._timer)
      this.__playRest()
    }
  }

  toggle () {
    var now = Date.now()
    if (this.state === 1) {
      this.stop()
      this._pauseStamp = now
    } else {
      this.state = 1
      this.play((this._pauseStamp || now) - (this._stamp || now), true)
      this._pauseStamp = 0
    }
  }

  stop () {
    this.state = 0
    clearTimeout(this._timer)
  }

  linkTo (offset) {
    this.play(offset)
  }

  __currentLrcRow (time) {
    for (var i = 0; i < this.lrcRow.length; i++) {
      if (time <= this.lrcRow[i].time) {
        break
      }
    }
    return i
  }

  __linkCbHandler (i) {
    if (i < 0) return
    this.cbHandler({
      text: this.lrcRow[i].text,
      rowNum: i
    })
  }

  __playRest () {
    let currentLrc = this.lrcRow[this.currentNum]
    let delay = currentLrc.time - (Date.now() - this._stamp)

    this._timer = setTimeout(() => {
      this.__linkCbHandler(this.currentNum++)
      if (this.currentNum < this.lrcRow.length && this.state === 1) {
        this.__playRest()
      }
    }, delay)
  }
}
