/*!

  otr.js v0.0.5-pre - 2012-08-24
  (c) 2012 - Arlo Breault <arlolra@gmail.com>
  Freely distributed under the LGPL license.

  This file is concatenated for the browser.
  Please see: https://github.com/arlolra/otr

*/

;(function () {

  var root = this

  var DH = {
      "N": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF"
    , "G": "2"
  }

  if (typeof exports !== 'undefined') {
    module.exports = DH
  } else {
    root.DH = DH
  }

}).call(this)
;(function () {

  var root = this

  var STATES = {

    // otr message states
      MSGSTATE_PLAINTEXT : 0
    , MSGSTATE_ENCRYPTED : 1
    , MSGSTATE_FINISHED  : 2

    // otr auth states
    , AUTHSTATE_NONE               : 0
    , AUTHSTATE_AWAITING_DHKEY     : 1
    , AUTHSTATE_AWAITING_REVEALSIG : 2
    , AUTHSTATE_AWAITING_SIG       : 3

    // whitespace tags
    , WHITESPACE_TAG    : '\x20\x09\x20\x20\x09\x09\x09\x09\x20\x09\x20\x09\x20\x09\x20\x20'
    , WHITESPACE_TAG_V2 : '\x20\x20\x09\x09\x20\x20\x09\x20'

    // otr tags
    , OTR_TAG       : '?OTR'
    , OTR_VERSION_2 : '\x00\x02'

  }

  if (typeof exports !== 'undefined') {
    module.exports = STATES
  } else {
    root.STATES = STATES
  }

}).call(this)
;(function () {

  var root = this

  var HLP
  if (typeof exports !== 'undefined') {
    HLP = exports
  } else {
    HLP = root.HLP = {}
  }

  var BigInt = root.BigInt
    , CryptoJS = root.CryptoJS

  if (typeof require !== 'undefined') {
    BigInt || (BigInt = require('../vendor/bigint.js'))
    CryptoJS || (CryptoJS = require('../vendor/crypto.js'))
  }

  // data types (byte lengths)
  var DTS = {
      BYTE  : 1
    , SHORT : 2
    , INT   : 4
    , CTR   : 8
    , MAC   : 20
    , SIG   : 40
  }

  // otr message wrapper begin and end
  var WRAPPER_BEGIN = "?OTR"
    , WRAPPER_END   = "."

  HLP.divMod = function (num, den, n) {
    return BigInt.multMod(num, BigInt.inverseMod(den, n), n)
  }

  HLP.subMod = function (one, two, n) {
    one = BigInt.mod(one, n)
    two = BigInt.mod(two, n)
    if (BigInt.greater(two, one)) one = BigInt.add(one, n)
    return BigInt.sub(one, two)
  }

  HLP.randomExponent = function () {
    return BigInt.randBigInt(1536)
  }

  HLP.randomValue = function () {
    return BigInt.randBigInt(128)
  }

  HLP.smpHash = function (version, fmpi, smpi) {
    var sha256 = CryptoJS.algo.SHA256.create()
    sha256.update(CryptoJS.enc.Latin1.parse(version.toString()))
    sha256.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(fmpi)))
    if (smpi) sha256.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(smpi)))
    var hash = sha256.finalize()
    return BigInt.str2bigInt(hash.toString(CryptoJS.enc.Hex), 16)
  }

  HLP.makeMac = function (aesctr, m) {
    var pass = CryptoJS.enc.Latin1.parse(m)
    var mac = CryptoJS.HmacSHA256(CryptoJS.enc.Latin1.parse(aesctr), pass)
    return HLP.mask(mac.toString(CryptoJS.enc.Latin1), 0, 160)
  }

  HLP.make1Mac = function (aesctr, m) {
    var pass = CryptoJS.enc.Latin1.parse(m)
    var mac = CryptoJS.HmacSHA1(CryptoJS.enc.Latin1.parse(aesctr), pass)
    return mac.toString(CryptoJS.enc.Latin1)
  }

  HLP.makeAes = function (msg, c, iv) {
    var opts = {
        mode: CryptoJS.mode.CTR
      , iv: CryptoJS.enc.Latin1.parse(iv)
      , padding: CryptoJS.pad.NoPadding
    }
    var aesctr = CryptoJS.AES.encrypt(
        CryptoJS.enc.Latin1.parse(msg)
      , CryptoJS.enc.Latin1.parse(c)
      , opts
    )
    var aesctr_decoded = CryptoJS.enc.Base64.parse(aesctr.toString())
    return CryptoJS.enc.Latin1.stringify(aesctr_decoded)
  }

  HLP.decryptAes = function (msg, c, iv) {
    msg = CryptoJS.enc.Latin1.parse(msg)
    var opts = {
        mode: CryptoJS.mode.CTR
      , iv: CryptoJS.enc.Latin1.parse(iv)
      , padding: CryptoJS.pad.NoPadding
    }
    var aesctr = CryptoJS.AES.decrypt(
        CryptoJS.enc.Base64.stringify(msg)
      , CryptoJS.enc.Latin1.parse(c)
      , opts
    )
    return aesctr.toString(CryptoJS.enc.Latin1)
  }

  HLP.multPowMod = function (a, b, c, d, e) {
    return BigInt.multMod(BigInt.powMod(a, b, e), BigInt.powMod(c, d, e), e)
  }

  HLP.ZKP = function (v, c, d, e) {
    return BigInt.equals(c, HLP.smpHash(v, d, e))
  }

  // greater than, or equal
  HLP.GTOE = function (a, b) {
    return (BigInt.equals(a, b) || BigInt.greater(a, b))
  }

  HLP.between = function (x, a, b) {
    return (BigInt.greater(x, a) && BigInt.greater(b, x))
  }

  var OPS = {
      'XOR': function (c, s) { return c ^ s }
    , 'OR': function (c, s) { return c | s }
    , 'AND': function (c, s) { return c & s }
  }
  HLP.bigBitWise = function (op, a, b) {
    var tf = (a.length > b.length)
      , short = tf ? b : a
      , long  = tf ? a : b
      , len = long.length
      , c = BigInt.expand(short, len)
      , i = 0
    for (; i < len; i++) {
      c[i] = OPS[op](c[i], long[i])
    }
    return c
  }

  HLP.h1 = function (b, secbytes) {
    var sha1 = CryptoJS.algo.SHA1.create()
    sha1.update(CryptoJS.enc.Latin1.parse(b))
    sha1.update(CryptoJS.enc.Latin1.parse(secbytes))
    return (sha1.finalize()).toString(CryptoJS.enc.Latin1)
  }

  HLP.h2 = function (b, secbytes) {
    var sha256 = CryptoJS.algo.SHA256.create()
    sha256.update(CryptoJS.enc.Latin1.parse(b))
    sha256.update(CryptoJS.enc.Latin1.parse(secbytes))
    return (sha256.finalize()).toString(CryptoJS.enc.Latin1)
  }

  HLP.mask = function (bytes, start, n) {
    return bytes.substr(start / 8, n / 8)
  }

  HLP.twotothe = function (g) {
    var ex = g % 4
    g = Math.floor(g / 4)
    var str = (Math.pow(2, ex)).toString()
    for (var i = 0; i < g; i++) str += '0'
    return BigInt.str2bigInt(str, 16)
  }

  HLP.packBytes = function (val, bytes) {
    var res = ''  // big-endian, unsigned long
    for (bytes -= 1; bytes > -1; bytes--) {
      res = _toString(val & 0xff) + res
      val >>= 8
    }
    return res
  }

  HLP.packINT = function (d) {
    return HLP.packBytes(d, DTS.INT)
  }

  HLP.packCtr = function (d) {
    return HLP.padCtr(HLP.packBytes(d, DTS.CTR))
  }

  HLP.padCtr = function (ctr) {
    return ctr + '\x00\x00\x00\x00\x00\x00\x00\x00'
  }

  HLP.unpackCtr = function (d) {
    d = HLP.toByteArray(d.substring(0, 8))
    return HLP.unpack(d)
  }

  HLP.unpack = function (arr) {
    return arr.reduce(function (p, n) {
      return (p << 8) | n
    }, 0)
  }

  HLP.packData = function (d) {
    return HLP.packINT(d.length) + d
  }

  HLP.bigInt2bits = function (bi) {
    bi = BigInt.dup(bi)
    var ba = ''
    while (!BigInt.isZero(bi)) {
      ba = _num2bin[bi[0] & 0xff] + ba
      BigInt.rightShift_(bi, 8)
    }
    return ba
  }

  HLP.bits2bigInt = function (bits) {
    bits = HLP.toByteArray(bits)
    return HLP.retMPI(bits)
  }

  HLP.packMPI = function (mpi) {
    return HLP.packData(HLP.bigInt2bits(BigInt.trim(mpi, 0)))
  }

  HLP.packSHORT = function (short) {
    return HLP.packBytes(short, DTS.SHORT)
  }

  HLP.unpackSHORT = function (short) {
    short = HLP.toByteArray(short)
    return HLP.unpack(short)
  }

  HLP.packTLV = function (type, value) {
    return HLP.packSHORT(type) + HLP.packSHORT(value.length) + value
  }

  HLP.readLen = function (msg) {
    msg = HLP.toByteArray(msg.substring(0, 4))
    return HLP.unpack(msg)
  }

  HLP.readData = function (data) {
    var n = HLP.unpack(data.splice(0, 4))
    return [n, data]
  }

  HLP.retMPI = function (data) {
    var mpi = BigInt.str2bigInt('0', 10, data.length)
    data.forEach(function (d, i) {
      if (i) BigInt.leftShift_(mpi, 8)
      mpi[0] |= d
    })
    return mpi
  }

  HLP.readMPI = function (data) {
    data = HLP.toByteArray(data)
    data = HLP.readData(data)
    return HLP.retMPI(data[1])
  }

  HLP.packMPIs = function (arr) {
    return arr.reduce(function (prv, cur) {
      return prv + HLP.packMPI(cur)
    }, '')
  }

  HLP.unpackMPIs = function (num, mpis) {
    var i = 0, arr = []
    for (; i < num; i++) arr.push('MPI')
    return (HLP.splitype(arr, mpis)).map(function (m) {
      return HLP.readMPI(m)
    })
  }

  HLP.wrapMsg = function (msg, fs) {
    msg = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Latin1.parse(msg))
    msg = WRAPPER_BEGIN + ":" + msg + WRAPPER_END

    if (!fs) return [null, msg]

    var n = Math.ceil(msg.length / fs)
    if (n > 65535) return ['Too many fragments']
    if (n == 1) return [null, msg]

    var k, bi, ei, frag, mf, mfs = []
    for (k = 1; k <= n; k++) {
      bi = (k - 1) * fs
      ei = k * fs
      frag = msg.slice(bi, ei)
      mf = WRAPPER_BEGIN + ','
      mf += k + ','
      mf += n + ','
      mf += frag + ','
      mfs.push(mf)
    }

    return [null, mfs]
  }

  HLP.splitype = function splitype(arr, msg) {
    var data = []
    arr.forEach(function (a) {
      var len, str
      switch (a) {
        case 'PUBKEY':
          str = splitype(['SHORT', 'MPI', 'MPI', 'MPI', 'MPI'], msg).join('')
          break
        case 'DATA':  // falls through
        case 'MPI':
          str = msg.substring(0, HLP.readLen(msg) + 4)
          break
        default:
          str = msg.substring(0, DTS[a])
      }
      data.push(str)
      msg = msg.substring(str.length)
    })

    return data
  }

  // https://github.com/msgpack/msgpack-javascript/blob/master/msgpack.js

  var _bin2num = {}
    , _num2bin = {}
    , _b642bin = {}
    , _toString = String.fromCharCode

  var i = 0, v

  for (; i < 0x100; ++i) {
    v = _toString(i)
    _bin2num[v] = i  // "\00" -> 0x00
    _num2bin[i] = v  //     0 -> "\00"
  }

  for (i = 0x80; i < 0x100; ++i) {  // [Webkit][Gecko]
    _bin2num[_toString(0xf700 + i)] = i  // "\f780" -> 0x80
  }

  HLP.toByteArray = function (data) {
    var rv = [], bin2num = _bin2num, remain
      , ary = data.split("")
      , i = -1
      , iz

    iz = ary.length
    remain = iz % 8

    while (remain--) {
      ++i
      rv[i] = bin2num[ary[i]]
    }
    remain = iz >> 3
    while (remain--) {
      rv.push(bin2num[ary[++i]], bin2num[ary[++i]],
              bin2num[ary[++i]], bin2num[ary[++i]],
              bin2num[ary[++i]], bin2num[ary[++i]],
              bin2num[ary[++i]], bin2num[ary[++i]])
    }
    return rv
  }

}).call(this)
// DSA
// http://www.itl.nist.gov/fipspubs/fip186.htm

;(function () {

  var root = this

  var DSA
  if (typeof exports !== 'undefined') {
    DSA = exports
  } else {
    DSA = root.DSA = {}
  }

  var BigInt = root.BigInt
    , CryptoJS = root.CryptoJS
    , HLP = root.HLP

  if (typeof require !== 'undefined') {
    BigInt || (BigInt = require('../vendor/bigint.js'))
    CryptoJS || (CryptoJS = require('../vendor/crypto.js'))
    HLP || (HLP = require('./helpers.js'))
  }

  var ZERO = BigInt.str2bigInt('0', 10)
    , ONE = BigInt.str2bigInt('1', 10)
    , TWO = BigInt.str2bigInt('2', 10)

  function makeRandom(min, max) {
    var c = BigInt.randBigInt(BigInt.bitSize(max))
    if (!HLP.between(c, min, max)) return makeRandom(min, max)
    return c
  }

  function pickBase(prime) {
    var b = BigInt.bitSize(prime)
    var base = BigInt.randBigInt(b)
    while (!BigInt.greater(prime, base))  // pick a random that's < ans
      base = BigInt.randBigInt(b)
    return base
  }

  function MR(prime) {
    var j = 0, k = true
    // 40x should give 2^-80 confidence
    for (; j < 40; j++) {
      if (!BigInt.millerRabin(prime, pickBase(prime))) {
        k = false
        break
      }
    }
    return k
  }

  DSA.Key = Key

  function Key() {
    if (!(this instanceof Key)) return new Key()

    this.N = 160
    this.L = 1024

    this.type = '\x00\x00'

    this.makePQ()
    this.makeG()

    this.x = makeRandom(ZERO, this.q)
    this.y = BigInt.powMod(this.g, this.x, this.p)
  }

  Key.prototype = {

    constructor: Key,

    makePQ: function() {
      var g = this.N
      this.seed = BigInt.randBigInt(this.N)

      var u = (CryptoJS.SHA1(HLP.bigInt2bits(this.seed))).toString(CryptoJS.enc.Hex)
      var tmp = BigInt.mod(BigInt.add(this.seed, ONE), HLP.twotothe(g))
      tmp = (CryptoJS.SHA1(HLP.bigInt2bits(tmp))).toString(CryptoJS.enc.Hex)
      u = HLP.bigBitWise(
          'XOR'
        , BigInt.str2bigInt(tmp, 16)
        , BigInt.str2bigInt(u, 16)
      )

      this.q = HLP.bigBitWise('OR', u, HLP.twotothe(g - 1))
      this.q = HLP.bigBitWise('OR', this.q, ONE)

      if (!MR(this.q)) return this.makePQ()

      this.counter = 0

      var n = Math.floor(this.L / this.N)
      var b = (this.L % this.N) - 1

      // var start = new Date()
      this.step7(TWO, this.N, n, b)
      // console.log(new Date() - start)
    },

    step7: function (offset, g, n, b) {
      var V = ZERO
      var W = ZERO

      var cache_seed_plus_offset = BigInt.add(this.seed, offset)

      var i = 0
      for (; i < (n + 1); i++) {
        V = BigInt.add(
            cache_seed_plus_offset
          , BigInt.str2bigInt(i.toString(), 10)
        )
        V = CryptoJS.SHA1(HLP.bigInt2bits(BigInt.mod(V, HLP.twotothe(g))))
        V = BigInt.str2bigInt(V.toString(CryptoJS.enc.Hex), 16)
        if (i === n) V = BigInt.mod(V, HLP.twotothe(b))
        V = BigInt.mult(V, HLP.twotothe(g * i))
        W = BigInt.add(W, V)
      }

      var Lminus = HLP.twotothe(this.L - 1)
      var X = BigInt.add(W, Lminus)
      // console.log(HLP.between(X, Lminus, HLP.twotothe(this.L)))

      var c = BigInt.mod(X, BigInt.mult(TWO, this.q))
      this.p = BigInt.sub(X, BigInt.sub(c, ONE))

      if (!BigInt.greater(Lminus, this.p)) {
        // test the primality of p
        if (MR(this.p)) return
      }

      offset = BigInt.add(offset, BigInt.str2bigInt((n + 1).toString(), 10))
      this.counter += 1

      if (this.counter >= 4096) return this.makePQ()
      this.step7(offset, g, n, b)
    },

    makeG: function (e) {
      var p_minus = BigInt.sub(this.p, ONE)
      if (!e) e = BigInt.multMod(
          p_minus
        , BigInt.inverseMod(this.q, this.p)
        , this.p
      )
      var h = TWO  // makeRandom(ONE, p_minus)
      this.g = BigInt.powMod(h, e, this.p)
      if (!BigInt.greater(this.g, ONE)) this.makeG(e)
    },

    packPublic: function () {
      var str = this.type
      str += HLP.packMPI(this.p)
      str += HLP.packMPI(this.q)
      str += HLP.packMPI(this.g)
      str += HLP.packMPI(this.y)
      return str
    },

    hsign: function (hm) {
      var k = makeRandom(ZERO, this.q)
      var r = BigInt.mod(BigInt.powMod(this.g, k, this.p), this.q)
      if (BigInt.isZero(r)) return this.hsign(hm)
      var s = BigInt.inverseMod(k, this.q)
      s = BigInt.mult(s, BigInt.add(hm, BigInt.mult(this.x, r)))
      s = BigInt.mod(s, this.q)
      if (BigInt.isZero(s)) return this.hsign(hm)
      return [r, s]
    },

    sign: function (m) {
      var hm = CryptoJS.enc.Latin1.parse(m)  // CryptoJS.SHA1(m)
      hm = BigInt.str2bigInt(hm.toString(CryptoJS.enc.Hex), 16)
      return this.hsign(hm)
    }

  }

  DSA.parsePublic = function (str) {
    str = HLP.splitype(['SHORT', 'MPI', 'MPI', 'MPI', 'MPI'], str)
    return {
        type: str[0]
      , p: HLP.readMPI(str[1])
      , q: HLP.readMPI(str[2])
      , g: HLP.readMPI(str[3])
      , y: HLP.readMPI(str[4])
    }
  }

  DSA.verify = function (key, m, r, s) {
    if (!HLP.between(r, ZERO, key.q) || !HLP.between(s, ZERO, key.q))
      return false

    var hm = CryptoJS.enc.Latin1.parse(m)  // CryptoJS.SHA1(m)
    hm = BigInt.str2bigInt(hm.toString(CryptoJS.enc.Hex), 16)

    var w = BigInt.inverseMod(s, key.q)
    var u1 = BigInt.multMod(hm, w, key.q)
    var u2 = BigInt.multMod(r, w, key.q)

    u1 = BigInt.powMod(key.g, u1, key.p)
    u2 = BigInt.powMod(key.y, u2, key.p)

    var v = BigInt.mod(BigInt.multMod(u1, u2, key.p), key.q)

    return BigInt.equals(v, r)
  }

  DSA.fingerprint = function (key) {
    var pk = key.packPublic()
    if (key.type === '\x00\x00')
      pk = pk.substring(2)
    return CryptoJS.SHA1(pk).toString(CryptoJS.enc.Hex)
  }

  DSA.inherit = function (key) {
    key.__proto__ = DSA.Key.prototype
    key.constructor = DSA.Key
    key.type = '\x00\x00'
  }

}).call(this)
;(function () {

  var root = this

  if (typeof exports !== 'undefined') {
    module.exports = SM
  } else {
    root.SM = SM
  }

  var BigInt = root.BigInt
    , CryptoJS = root.CryptoJS
    , DH = root.DH
    , HLP = root.HLP
    , DSA = root.DSA

  if (typeof require !== 'undefined') {
    BigInt || (BigInt = require('../vendor/bigint.js'))
    CryptoJS || (CryptoJS = require('../vendor/crypto.js'))
    DH || (DH = require('./dh.js'))
    HLP || (HLP = require('./helpers.js'))
    DSA || (DSA = require('./dsa.js'))
  }

  // smp machine states
  var SMPSTATE_EXPECT1 = 1
    , SMPSTATE_EXPECT2 = 2
    , SMPSTATE_EXPECT3 = 3
    , SMPSTATE_EXPECT4 = 4

  // otr message states
  var MSGSTATE_PLAINTEXT = 0
    , MSGSTATE_ENCRYPTED = 1
    , MSGSTATE_FINISHED = 2

  // diffie-hellman modulus and generator
  // see group 5, RFC 3526
  var G = BigInt.str2bigInt(DH.G, 10)
  var N = BigInt.str2bigInt(DH.N, 16)

  // to calculate D's for zero-knowledge proofs
  var Q = BigInt.sub(N, BigInt.str2bigInt('1', 10))
  BigInt.divInt_(Q, 2)  // meh

  function SM(otr) {
    if (!(this instanceof SM)) return new SM(otr)

    this.otr = otr
    this.version = '1'
    this.our_fp = DSA.fingerprint(otr.priv)
    this.their_fp = DSA.fingerprint(otr.their_priv_pk)

    // initial state
    this.init()
  }

  SM.prototype = {

    // set the constructor
    // because the prototype is being replaced
    constructor: SM,

    // set the initial values
    // also used when aborting
    init: function () {
      this.smpstate = SMPSTATE_EXPECT1
      this.secret = null
    },

    makeSecret: function (our) {
      var sha256 = CryptoJS.algo.SHA256.create()
      sha256.update(this.version)
      sha256.update(our ? this.our_fp : this.their_fp)
      sha256.update(our ? this.their_fp : this.our_fp)
      sha256.update(this.otr.ssid)    // secure session id
      sha256.update(this.otr.secret)  // user input string
      var hash = sha256.finalize()
      this.secret = BigInt.str2bigInt(hash.toString(CryptoJS.enc.Hex), 16)
    },

    makeG2s: function () {
      this.g2a = BigInt.powMod(G, this.a2, N)
      this.g3a = BigInt.powMod(G, this.a3, N)
    },

    computeGs: function (g2a, g3a) {
      this.g2 = BigInt.powMod(g2a, this.a2, N)
      this.g3 = BigInt.powMod(g3a, this.a3, N)
    },

    computePQ: function (r) {
      this.p = BigInt.powMod(this.g3, r, N)
      this.q = HLP.multPowMod(G, r, this.g2, this.secret, N)
    },

    computeR: function () {
      this.r = BigInt.powMod(this.QoQ, this.a3, N)
    },

    computeRab: function (r) {
      return BigInt.powMod(r, this.a3, N)
    },

    computeC: function (v, r) {
      return HLP.smpHash(v, BigInt.powMod(G, r, N))
    },

    computeD: function (r, a, c) {
      return HLP.subMod(r, BigInt.multMod(a, c, Q), Q)
    },

    // the bulk of the work
    handleSM: function (msg) {
      var send, r2, r3, r4, r5, r6, r7, t1, t2, t3, t4
        , rab, tmp, tmp2, cP, cR, d5, d6, d7, ms

      var expectStates = {
          2: SMPSTATE_EXPECT1
        , 3: SMPSTATE_EXPECT2
        , 4: SMPSTATE_EXPECT3
        , 5: SMPSTATE_EXPECT4
      }

      if (msg.type === 6) {
        this.init()
        return
      }

      // abort! there was an error
      if ( this.smpstate !== expectStates[msg.type] ||
           this.otr.msgstate !== MSGSTATE_ENCRYPTED
      ) return this.abort()

      switch (this.smpstate) {

        case SMPSTATE_EXPECT1:
          // 0:g2a, 1:c2, 2:d2, 3:g3a, 4:c3, 5:d3
          ms = HLP.readLen(msg.msg.substr(0, 4))
          if (ms !== 6) return this.abort()
          msg = HLP.unpackMPIs(6, msg.msg.substring(4))

          this.makeSecret()

          // verify znp's
          if (!HLP.ZKP(1, msg[1], HLP.multPowMod(G, msg[2], msg[0], msg[1], N)))
            return this.abort()

          if (!HLP.ZKP(2, msg[4], HLP.multPowMod(G, msg[5], msg[3], msg[4], N)))
            return this.abort()

          this.g3ao = msg[3]  // save for later

          this.a2 = HLP.randomExponent()
          this.a3 = HLP.randomExponent()

          this.makeG2s()

          // zero-knowledge proof that the exponents
          // associated with g2a & g3a are known
          r2 = HLP.randomExponent()
          r3 = HLP.randomExponent()
          this.c2 = this.computeC(3, r2)
          this.c3 = this.computeC(4, r3)
          this.d2 = this.computeD(r2, this.a2, this.c2)
          this.d3 = this.computeD(r3, this.a3, this.c3)

          this.computeGs(msg[0], msg[3])

          r4 = HLP.randomExponent()

          this.computePQ(r4)

          // zero-knowledge proof that P & Q
          // were generated according to the protocol
          r5 = HLP.randomExponent()
          r6 = HLP.randomExponent()
          tmp = HLP.multPowMod(G, r5, this.g2, r6, N)
          cP = HLP.smpHash(5, BigInt.powMod(this.g3, r5, N), tmp)
          d5 = this.computeD(r5, r4, cP)
          d6 = this.computeD(r6, this.secret, cP)

          this.smpstate = SMPSTATE_EXPECT3

          send = HLP.packINT(11) + HLP.packMPIs([
              this.g2a
            , this.c2
            , this.d2
            , this.g3a
            , this.c3
            , this.d3
            , this.p
            , this.q
            , cP
            , d5
            , d6
          ])

          // TLV
          send = HLP.packTLV(3, send)
          break

        case SMPSTATE_EXPECT2:
          // 0:g2a, 1:c2, 2:d2, 3:g3a, 4:c3, 5:d3, 6:p, 7:q, 8:cP, 9:d5, 10:d6
          ms = HLP.readLen(msg.msg.substr(0, 4))
          if (ms !== 11) return this.abort()
          msg = HLP.unpackMPIs(11, msg.msg.substring(4))

          // verify znp of c3 / c3
          if (!HLP.ZKP(3, msg[1], HLP.multPowMod(G, msg[2], msg[0], msg[1], N)))
            return this.abort()

          if (!HLP.ZKP(4, msg[4], HLP.multPowMod(G, msg[5], msg[3], msg[4], N)))
            return this.abort()

          this.g3ao = msg[3]  // save for later

          this.computeGs(msg[0], msg[3])

          // verify znp of cP
          t1 = HLP.multPowMod(this.g3, msg[9], msg[6], msg[8], N)
          t2 = HLP.multPowMod(G, msg[9], this.g2, msg[10], N)
          t2 = BigInt.multMod(t2, BigInt.powMod(msg[7], msg[8], N), N)

          if (!HLP.ZKP(5, msg[8], t1, t2))
            return this.abort()

          r4 = HLP.randomExponent()

          this.computePQ(r4)

          // zero-knowledge proof that P & Q
          // were generated according to the protocol
          r5 = HLP.randomExponent()
          r6 = HLP.randomExponent()
          tmp = HLP.multPowMod(G, r5, this.g2, r6, N)
          cP = HLP.smpHash(6, BigInt.powMod(this.g3, r5, N), tmp)
          d5 = this.computeD(r5, r4, cP)
          d6 = this.computeD(r6, this.secret, cP)

          // store these
          this.QoQ = HLP.divMod(this.q, msg[7], N)
          this.PoP = HLP.divMod(this.p, msg[6], N)

          this.computeR()

          // zero-knowledge proof that R
          // was generated according to the protocol
          r7 = HLP.randomExponent()
          tmp2 = BigInt.powMod(this.QoQ, r7, N)
          cR = HLP.smpHash(7, BigInt.powMod(G, r7, N), tmp2)
          d7 = this.computeD(r7, this.a3, cR)

          this.smpstate = SMPSTATE_EXPECT4

          send = HLP.packINT(8) + HLP.packMPIs([
              this.p
            , this.q
            , cP
            , d5
            , d6
            , this.r
            , cR
            , d7
          ])

          // TLV
          send = HLP.packTLV(4, send)
          break

        case SMPSTATE_EXPECT3:
          // 0:p, 1:q, 2:cP, 3:d5, 4:d6, 5:r, 6:cR, 7:d7
          ms = HLP.readLen(msg.msg.substr(0, 4))
          if (ms !== 8) return this.abort()
          msg = HLP.unpackMPIs(8, msg.msg.substring(4))

          // verify znp of cP
          t1 = HLP.multPowMod(this.g3, msg[3], msg[0], msg[2], N)
          t2 = HLP.multPowMod(G, msg[3], this.g2, msg[4], N)
          t2 = BigInt.multMod(t2, BigInt.powMod(msg[1], msg[2], N), N)

          if (!HLP.ZKP(6, msg[2], t1, t2))
            return this.abort()

          // verify znp of cR
          t3 = HLP.multPowMod(G, msg[7], this.g3ao, msg[6], N)
          this.QoQ = HLP.divMod(msg[1], this.q, N)  // save Q over Q
          t4 = HLP.multPowMod(this.QoQ, msg[7], msg[5], msg[6], N)

          if (!HLP.ZKP(7, msg[6], t3, t4))
            return this.abort()

          this.computeR()

          // zero-knowledge proof that R
          // was generated according to the protocol
          r7 = HLP.randomExponent()
          tmp2 = BigInt.powMod(this.QoQ, r7, N)
          cR = HLP.smpHash(8, BigInt.powMod(G, r7, N), tmp2)
          d7 = this.computeD(r7, this.a3, cR)

          rab = this.computeRab(msg[5])

          if (!BigInt.equals(rab, HLP.divMod(msg[0], this.p, N)))
            return this.abort()

          send = HLP.packINT(3) + HLP.packMPIs([ this.r, cR, d7 ])

          // TLV
          send = HLP.packTLV(5, send)

          this.otr.trust = true
          this.init()
          break

        case SMPSTATE_EXPECT4:
          // 0:r, 1:cR, 2:d7
          ms = HLP.readLen(msg.msg.substr(0, 4))
          if (ms !== 3) return this.abort()
          msg = HLP.unpackMPIs(3, msg.msg.substring(4))

          // verify znp of cR
          t3 = HLP.multPowMod(G, msg[2], this.g3ao, msg[1], N)
          t4 = HLP.multPowMod(this.QoQ, msg[2], msg[0], msg[1], N)
          if (!HLP.ZKP(8, msg[1], t3, t4))
            return this.abort()

          rab = this.computeRab(msg[0])

          if (!BigInt.equals(rab, this.PoP))
            return this.abort()

          this.otr.trust = true
          this.init()
          return

      }

      this.sendMsg(send)
    },

    // send a message
    sendMsg: function (send) {
      this.otr.sendMsg('\x00' + send)
    },

    initiate: function () {

      if (this.otr.msgstate !== MSGSTATE_ENCRYPTED)
        return this.otr.error('Not ready to send encrypted messages.')

      this.makeSecret(true)

      if (this.smpstate !== SMPSTATE_EXPECT1)
        this.abort()  // abort + restart

      this.a2 = HLP.randomValue()
      this.a3 = HLP.randomValue()
      this.makeG2s()

      // zero-knowledge proof that the exponents
      // associated with g2a & g3a are known
      var r2 = HLP.randomValue()
      var r3 = HLP.randomValue()
      this.c2 = this.computeC(1, r2)
      this.c3 = this.computeC(2, r3)
      this.d2 = this.computeD(r2, this.a2, this.c2)
      this.d3 = this.computeD(r3, this.a3, this.c3)

      // set the next expected state
      this.smpstate = SMPSTATE_EXPECT2

      var send = HLP.packINT(6) + HLP.packMPIs([
          this.g2a
        , this.c2
        , this.d2
        , this.g3a
        , this.c3
        , this.d3
      ])

      // TLV
      send = HLP.packTLV(2, send)

      this.sendMsg(send)
    },

    abort: function () {
      this.init()
      this.sendMsg(HLP.packTLV(6, ''))
    }

  }

}).call(this)
;(function () {

  var root = this

  if (typeof exports !== 'undefined') {
    module.exports = AKE
  } else {
    root.AKE = AKE
  }

  var CryptoJS = root.CryptoJS
    , BigInt = root.BigInt
    , DH = root.DH
    , HLP = root.HLP
    , DSA = root.DSA
    , STATES = root.STATES

  if (typeof require !== 'undefined') {
    CryptoJS || (CryptoJS = require('../vendor/crypto.js'))
    BigInt || (BigInt = require('../vendor/bigint.js'))
    DH || (DH = require('./dh.js'))
    HLP || (HLP = require('./helpers.js'))
    DSA || (DSA = require('./dsa.js'))
    STATES || (STATES = require('./states.js'))
  }

  // diffie-hellman modulus and generator
  // see group 5, RFC 3526
  var G = BigInt.str2bigInt(DH.G, 10)
  var N = BigInt.str2bigInt(DH.N, 16)
  var TWO = BigInt.str2bigInt('2', 10)
  var N_MINUS_2 = BigInt.sub(N, TWO)

  // helpers
  function checkGroup(g) {
    return HLP.GTOE(g, TWO) && HLP.GTOE(N_MINUS_2, g)
  }

  function hMac(gx, gy, pk, kid, m) {
    var pass = CryptoJS.enc.Latin1.parse(m)
    var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, pass)
    hmac.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(gx)))
    hmac.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(gy)))
    hmac.update(CryptoJS.enc.Latin1.parse(pk))
    hmac.update(CryptoJS.enc.Latin1.parse(kid))
    return (hmac.finalize()).toString(CryptoJS.enc.Latin1)
  }

  var DEBUG = false
  function debug(msg) {
    if (DEBUG && typeof console !== 'undefined') console.log(msg)
  }

  // AKE constructor
  function AKE(otr) {
    if (!(this instanceof AKE)) return new AKE(otr)

    // otr instance
    this.otr = otr

    // our keys
    this.our_dh = otr.our_old_dh
    this.our_keyid = otr.our_keyid - 1

    // their keys
    this.their_y = null
    this.their_keyid = null
    this.their_priv_pk = null

    // state
    this.ssid = null
    this.transmittedRS = false
    this.r = null
    this.priv = otr.priv

    // bind methods
    var self = this
    ;['sendMsg'].forEach(function (meth) {
      self[meth] = self[meth].bind(self)
    })
  }

  AKE.prototype = {

    constructor: AKE,

    createKeys: function(g) {
      var s = BigInt.powMod(g, this.our_dh.privateKey, N)
      var secbytes = HLP.packMPI(s)
      this.ssid = HLP.mask(HLP.h2('\x00', secbytes), 0, 64)  // first 64-bits
      var tmp = HLP.h2('\x01', secbytes)
      this.c = HLP.mask(tmp, 0, 128)  // first 128-bits
      this.c_prime = HLP.mask(tmp, 128, 128)  // second 128-bits
      this.m1 = HLP.h2('\x02', secbytes)
      this.m2 = HLP.h2('\x03', secbytes)
      this.m1_prime = HLP.h2('\x04', secbytes)
      this.m2_prime = HLP.h2('\x05', secbytes)
    },

    verifySignMac: function (mac, aesctr, m2, c, their_y, our_dh_pk, m1, ctr) {
      // verify mac
      var vmac = HLP.makeMac(aesctr, m2)
      if (mac !== vmac) return ['MACs do not match.']

      // decrypt x
      var x = HLP.decryptAes(aesctr.substring(4), c, ctr)
      x = HLP.splitype(['PUBKEY', 'INT', 'SIG'], x)

      var m = hMac(their_y, our_dh_pk, x[0], x[1], m1)
      var pub = DSA.parsePublic(x[0])

      var r = HLP.bits2bigInt(x[2].substring(0, 20))
      var s = HLP.bits2bigInt(x[2].substring(20))

      // verify sign m
      if (!DSA.verify(pub, m, r, s)) return ['Cannot verify signature of m.']

      return [null, HLP.readLen(x[1]), pub]
    },

    makeM: function (their_y, m1, c, m2) {
      var pk = this.priv.packPublic()
      var kid = HLP.packINT(this.our_keyid)
      var m = hMac(this.our_dh.publicKey, their_y, pk, kid, m1)
      m = this.priv.sign(m)
      var msg = pk + kid + HLP.bigInt2bits(m[0]) + HLP.bigInt2bits(m[1])
      var aesctr = HLP.packData(HLP.makeAes(msg, c, HLP.packCtr(0)))
      var mac = HLP.makeMac(aesctr, m2)
      return aesctr + mac
    },

    akeSuccess: function () {
      debug('success')

      if (BigInt.equals(this.their_y, this.our_dh.publicKey))
        return this.otr.error('equal keys - we have a problem.', true)

      if ( this.their_keyid !== this.otr.their_keyid &&
           this.their_keyid !== (this.otr.their_keyid - 1) ) {

        // our keys
        this.otr.our_old_dh = this.our_dh

        // their keys
        this.otr.their_y = this.their_y
        this.otr.their_old_y = null
        this.otr.their_keyid = this.their_keyid
        this.otr.their_priv_pk = this.their_priv_pk
        DSA.inherit(this.otr.their_priv_pk)

        // rotate keys
        this.otr.sessKeys[0] = [ new this.otr.dhSession(
            this.otr.our_dh
          , this.otr.their_y
        ), null ]
        this.otr.sessKeys[1] = [ new this.otr.dhSession(
            this.otr.our_old_dh
          , this.otr.their_y
        ), null ]

      }

      // ake info
      this.otr.ssid = this.ssid
      this.otr.transmittedRS = this.transmittedRS
      this.otr.smInit()

      // go encrypted
      this.otr.authstate = STATES.AUTHSTATE_NONE
      this.otr.msgstate = STATES.MSGSTATE_ENCRYPTED

      // send stored msgs
      this.otr.sendStored()
    },

    handleAKE: function (msg) {
      var send, vsm

      switch (msg.type) {

        case '\x02':
          debug('d-h key message')

          if (!this.otr.ALLOW_V2) return  // ignore

          msg = HLP.splitype(['DATA', 'DATA'], msg.msg)

          if (this.otr.authstate === STATES.AUTHSTATE_AWAITING_DHKEY) {
            var ourHash = HLP.readMPI(this.myhashed)
            var theirHash = HLP.readMPI(msg[1])
            if (BigInt.greater(ourHash, theirHash)) {
              send = this.dhcommit
              break  // ignore
            } else {
              // forget
              this.our_dh = this.otr.dh()
              this.otr.authstate = STATES.AUTHSTATE_NONE
              this.r = null
              this.myhashed = null
            }
          } else if (
            this.otr.authstate === STATES.AUTHSTATE_AWAITING_SIG
          ) this.our_dh = this.otr.dh()

          this.otr.authstate = STATES.AUTHSTATE_AWAITING_REVEALSIG

          this.encrypted = msg[0].substring(4)
          this.hashed = msg[1].substring(4)

          send = '\x0a'
          send += HLP.packMPI(this.our_dh.publicKey)
          break

        case '\x0a':
          debug('reveal signature message')

          if (!this.otr.ALLOW_V2) return  // ignore

          msg = HLP.splitype(['MPI'], msg.msg)

          if (this.otr.authstate !== STATES.AUTHSTATE_AWAITING_DHKEY) {
            if (this.otr.authstate === STATES.AUTHSTATE_AWAITING_SIG) {
              if (!BigInt.equals(this.their_y, HLP.readMPI(msg[0]))) return
            } else {
              return  // ignore
            }
          }

          this.otr.authstate = STATES.AUTHSTATE_AWAITING_SIG

          this.their_y = HLP.readMPI(msg[0])

          // verify gy is legal 2 <= gy <= N-2
          if (!checkGroup(this.their_y))
            return this.otr.error('Illegal g^y.', true)

          this.createKeys(this.their_y)

          send = '\x11'
          send += HLP.packMPI(this.r)
          send += this.makeM(this.their_y, this.m1, this.c, this.m2)
          break

        case '\x11':
          debug('signature message')

          if ( !this.otr.ALLOW_V2 ||
               this.otr.authstate !== STATES.AUTHSTATE_AWAITING_REVEALSIG
          ) return  // ignore

          msg = HLP.splitype(['DATA', 'DATA', 'MAC'], msg.msg)

          this.r = HLP.readMPI(msg[0])

          // decrypt their_y
          var key = CryptoJS.enc.Hex.parse(BigInt.bigInt2str(this.r, 16))
          key = CryptoJS.enc.Latin1.stringify(key)
          var gxmpi = HLP.decryptAes(this.encrypted, key, HLP.packCtr(0))

          this.their_y = HLP.readMPI(gxmpi)

          // verify hash
          var hash = CryptoJS.SHA256(CryptoJS.enc.Latin1.parse(gxmpi))

          if (this.hashed !== hash.toString(CryptoJS.enc.Latin1))
            return this.otr.error('Hashed g^x does not match.', true)

          // verify gx is legal 2 <= g^x <= N-2
          if (!checkGroup(this.their_y))
            return this.otr.error('Illegal g^x.', true)

          this.createKeys(this.their_y)

          vsm = this.verifySignMac(
              msg[2]
            , msg[1]
            , this.m2
            , this.c
            , this.their_y
            , this.our_dh.publicKey
            , this.m1
            , HLP.packCtr(0)
          )
          if (vsm[0]) return this.otr.error(vsm[0], true)

          // store their key
          this.their_keyid = vsm[1]
          this.their_priv_pk = vsm[2]

          send = '\x12'
          send += this.makeM(
              this.their_y
            , this.m1_prime
            , this.c_prime
            , this.m2_prime
          )
          this.sendMsg(send)

          this.akeSuccess()
          return

        case '\x12':
          debug('data message')

          if ( !this.otr.ALLOW_V2 ||
               this.otr.authstate !== STATES.AUTHSTATE_AWAITING_SIG
          ) return  // ignore

          msg = HLP.splitype(['DATA', 'MAC'], msg.msg)

          vsm = this.verifySignMac(
              msg[1]
            , msg[0]
            , this.m2_prime
            , this.c_prime
            , this.their_y
            , this.our_dh.publicKey
            , this.m1_prime
            , HLP.packCtr(0)
          )
          if (vsm[0]) return this.otr.error(vsm[0], true)

          // store their key
          this.their_keyid = vsm[1]
          this.their_priv_pk = vsm[2]

          this.transmittedRS = true
          this.akeSuccess()
          return

        default:
          return  // ignore

      }

      this.sendMsg(send)
    },

    sendMsg: function (msg) {
      msg = STATES.OTR_VERSION_2 + msg
      msg = HLP.wrapMsg(msg, this.otr.fragment_size)
      if (msg[0]) return this.otr.error(msg[0])
      this.otr.sendMsg(msg[1], true)
    },

    initiateAKE: function () {
      debug('d-h commit message')

      // save in case we have to resend
      this.dhcommit = '\x02'

      this.otr.authstate = STATES.AUTHSTATE_AWAITING_DHKEY

      var gxmpi = HLP.packMPI(this.our_dh.publicKey)

      this.r = HLP.randomValue()
      var key = CryptoJS.enc.Hex.parse(BigInt.bigInt2str(this.r, 16))
      key = CryptoJS.enc.Latin1.stringify(key)
      this.dhcommit += HLP.packData(HLP.makeAes(gxmpi, key, HLP.packCtr(0)))

      this.myhashed = CryptoJS.SHA256(CryptoJS.enc.Latin1.parse(gxmpi))
      this.myhashed = HLP.packData(this.myhashed.toString(CryptoJS.enc.Latin1))
      this.dhcommit += this.myhashed

      this.sendMsg(this.dhcommit)
    }

  }

}).call(this)
;(function () {

  var root = this

  var ParseOTR
  if (typeof exports !== 'undefined') {
    ParseOTR = exports
  } else {
    ParseOTR = root.ParseOTR = {}
  }

  var CryptoJS = root.CryptoJS
    , HLP = root.HLP
    , STATES = root.STATES

  if (typeof require !== 'undefined') {
    CryptoJS || (CryptoJS = require('../vendor/crypto.js'))
    HLP || (HLP = require('./helpers.js'))
    STATES || (STATES = require('./states.js'))
  }

  ParseOTR.parseMsg = function (otr, msg) {

    // is this otr?
    var start = msg.indexOf(STATES.OTR_TAG)
    if (!~start) {

      // restart fragments
      this.initFragment(otr)

      // whitespace tags
      var ver = []
      ind = msg.indexOf(STATES.WHITESPACE_TAG)

      if (~ind) {

        msg = msg.split('')
        msg.splice(ind, 16)

        var len = msg.length
        for (; ind < len;) {
          if (msg.slice(ind, ind + 8).join('') === STATES.WHITESPACE_TAG_V2) {
            msg.splice(ind, 8)
            ver.push(STATES.OTR_VERSION_2)
            break
          }
          ind += 8
        }

        msg = msg.join('')

      }

      return { msg: msg, ver: ver }
    }

    var ind = start + STATES.OTR_TAG.length
    var com = msg[ind]

    // message fragment
    if (com === ',') {
      return this.msgFragment(otr, msg.substring(ind + 1))
    }

    this.initFragment(otr)

    // query message
    if (~['?', 'v'].indexOf(com)) {

      // version 1
      if (msg[ind] === '?') {
        otr.versions['1'] = true
        ind += 1
      }

      // other versions
      var qs = msg.substring(ind + 1)
      var qi = qs.indexOf('?')

      if (qi < 1) return
      qs = qs.substring(0, qi).split('')

      if (msg[ind] === 'v') {
        qs.forEach(function (q) {
          otr.versions[q] = true
        })
      }

      // start ake
      if (otr.ALLOW_V2 && otr.versions['2']) {
        return { cls: 'query', version: '2' }
      }

      return
    }

    // otr message
    if (com === ':') {

      ind += 1

      var info = msg.substring(ind, ind + 4)
      if (info.length < 4) return { msg: msg }
      info = CryptoJS.enc.Base64.parse(info).toString(CryptoJS.enc.Latin1)

      var version = info.substring(0, 2)
      var type = info.substring(2)

      // only supporting otr version 2
      if (!otr['ALLOW_V' + HLP.unpackSHORT(version)]) return { msg: msg }

      ind += 4

      var end = msg.substring(ind).indexOf('.')
      if (!~end) return { msg: msg }

      msg = CryptoJS.enc.Base64.parse(msg.substring(ind, ind + end))
      msg = CryptoJS.enc.Latin1.stringify(msg)

      var cls
      if (~['\x02', '\x0a', '\x11', '\x12'].indexOf(type)) {
        cls = 'ake'
      } else if (type === '\x03') {
        cls = 'data'
      }

      return {
          version: version
        , type: type
        , msg: msg
        , cls: cls
      }
    }

    // error message
    if (msg.substring(ind, ind + 7) === ' Error:') {
      if (otr.ERROR_START_AKE) {
        otr.sendQueryMsg()
      }
      return { msg: msg.substring(ind + 7), cls: 'error' }
    }

    return { msg: msg }
  }

  ParseOTR.initFragment = function (otr) {
    otr.fragment = { s: '', j: 0, k: 0 }
  }

  ParseOTR.msgFragment = function (otr, msg) {
    msg = msg.split(',')

    if (msg.length < 4 ||
      isNaN(parseInt(msg[0], 10)) ||
      isNaN(parseInt(msg[1], 10))
    ) return

    var k = parseInt(msg[0], 10)
    var n = parseInt(msg[1], 10)
    msg = msg[2]

    if (n < k || n === 0 || k === 0) {
      this.initFragment(otr)
      return
    }

    if (k === 1) {
      this.initFragment(otr)
      otr.fragment = { k: 1, n: n, s: msg }
    } else if (n === otr.fragment.n && k === (otr.fragment.k + 1)) {
      otr.fragment.s += msg
      otr.fragment.k += 1
    } else {
      this.initFragment(otr)
    }

    if (n === k) {
      msg = otr.fragment.s
      this.initFragment(otr)
      return this.parseMsg(otr, msg)
    }

    return
  }

}).call(this)
;(function () {

  var root = this

  if (typeof exports !== 'undefined') {
    module.exports = OTR
  } else {
    root.OTR = OTR
  }

  var CryptoJS = root.CryptoJS
    , BigInt = root.BigInt
    , DH = root.DH
    , HLP = root.HLP
    , DSA = root.DSA
    , AKE = root.AKE
    , SM = root.SM
    , STATES = root.STATES
    , ParseOTR = root.ParseOTR

  if (typeof require !== 'undefined') {
    CryptoJS || (CryptoJS = require('../vendor/crypto.js'))
    BigInt || (BigInt = require('../vendor/bigint.js'))
    DH || (DH = require('./dh.js'))
    HLP || (HLP = require('./helpers.js'))
    DSA || (DSA = require('./dsa.js'))
    AKE || (AKE = require('./ake.js'))
    SM || (SM = require('./sm.js'))
    STATES || (STATES = require('./states.js'))
    ParseOTR || (ParseOTR = require('./parse.js'))
  }

  // diffie-hellman modulus and generator
  // see group 5, RFC 3526
  var G = BigInt.str2bigInt(DH.G, 10)
  var N = BigInt.str2bigInt(DH.N, 16)

  // OTR contructor
  function OTR(priv, uicb, iocb, options) {
    if (!(this instanceof OTR)) return new OTR(priv, uicb, iocb, options)

    // private keys
    if (priv && !(priv instanceof DSA.Key))
      throw new Error('Requires long-lived DSA key.')

    this.priv = priv ? priv : new DSA.Key()

    // options
    options = options || {}

    this.fragment_size = options.fragment_size || 0
    if (!(this.fragment_size >= 0))
      throw new Error('Fragment size must be a positive integer.')

    this.send_interval = options.send_interval || 0
    if (!(this.send_interval >= 0))
      throw new Error('Send interval must be a positive integer.')

    // attach callbacks
    if ( !iocb || typeof iocb !== 'function' ||
         !uicb || typeof uicb !== 'function'
    ) throw new Error('UI and IO callbacks are required.')

    this.uicb = uicb
    this._iocb = iocb
    this.outgoing = []

    // init vals
    this.init()

    // bind methods
    var self = this
    ;['sendMsg', 'receiveMsg'].forEach(function (meth) {
      self[meth] = self[meth].bind(self)
    })
  }

  OTR.prototype = {

    constructor: OTR,

    init: function () {

      this.msgstate = STATES.MSGSTATE_PLAINTEXT
      this.authstate = STATES.AUTHSTATE_NONE

      this.ALLOW_V2 = true

      this.REQUIRE_ENCRYPTION = false
      this.SEND_WHITESPACE_TAG = false
      this.WHITESPACE_START_AKE = false
      this.ERROR_START_AKE = false

      ParseOTR.initFragment(this)

      this.versions = {}

      // their keys
      this.their_y = null
      this.their_old_y = null
      this.their_keyid = 0
      this.their_priv_pk = null

      // our keys
      this.our_dh = this.dh()
      this.our_old_dh = this.dh()
      this.our_keyid = 2

      // session keys
      this.sessKeys = [ new Array(2), new Array(2) ]

      // saved
      this.storedMgs = []
      this.oldMacKeys = []

      this.sm = null  // initialized after AKE
      this.trust = false  // will be true after successful smp

      // when ake is complete
      // save their keys and the session
      this.akeInit()

      // user provided secret for SM
      this.secret = 'cryptocat?'

    },

    akeInit: function () {
      this.ake = new AKE(this)
      this.transmittedRS = false
      this.ssid = null
    },

    smInit: function () {
      this.sm = new SM(this)
    },

    iocb: function iocb(msg) {

      // buffer
      this.outgoing = this.outgoing.concat(msg)

      // send sync
      if (!this.send_interval) {
        while (this.outgoing.length) {
          msg = this.outgoing.shift()
          this._iocb(msg)
        }
        return
      }

      // an async option
      // maybe this is outside the scope?
      var self = this
      function send() {
        if (!self.outgoing.length) return
        var msg = self.outgoing.shift()
        self._iocb(msg)
        setTimeout(send, self.send_interval)
      }
      setTimeout(send, this.send_interval)

    },

    dh: function dh() {
      var keys = { privateKey: BigInt.randBigInt(320) }
      keys.publicKey = BigInt.powMod(G, keys.privateKey, N)
      return keys
    },

    // session constructor
    dhSession: function dhSession(our_dh, their_y) {
      if (!(this instanceof dhSession)) return new dhSession(our_dh, their_y)

      // shared secret
      var s = BigInt.powMod(their_y, our_dh.privateKey, N)
      var secbytes = HLP.packMPI(s)

      // session id
      this.id = HLP.mask(HLP.h2('\x00', secbytes), 0, 64)  // first 64-bits

      // are we the high or low end of the connection?
      var sq = BigInt.greater(our_dh.publicKey, their_y)
      var sendbyte = sq ? '\x01' : '\x02'
      var rcvbyte  = sq ? '\x02' : '\x01'

      // sending and receiving keys
      this.sendenc = HLP.mask(HLP.h1(sendbyte, secbytes), 0, 128)  // f16 bytes
      this.sendmac = CryptoJS.SHA1(CryptoJS.enc.Latin1.parse(this.sendenc))
      this.sendmac = this.sendmac.toString(CryptoJS.enc.Latin1)
      this.sendmacused = false
      this.rcvenc = HLP.mask(HLP.h1(rcvbyte, secbytes), 0, 128)
      this.rcvmac = CryptoJS.SHA1(CryptoJS.enc.Latin1.parse(this.rcvenc))
      this.rcvmac = this.rcvmac.toString(CryptoJS.enc.Latin1)
      this.rcvmacused = false

      // counters
      this.send_counter = 0
      this.rcv_counter = 0
    },

    rotateOurKeys: function () {

      // reveal old mac keys
      var self = this
      this.sessKeys[1].forEach(function (sk) {
        if (sk && sk.sendmacused) self.oldMacKeys.push(sk.sendmac)
        if (sk && sk.rcvmacused) self.oldMacKeys.push(sk.rcvmac)
      })

      // rotate our keys
      this.our_old_dh = this.our_dh
      this.our_dh = this.dh()
      this.our_keyid += 1

      this.sessKeys[1][0] = this.sessKeys[0][0]
      this.sessKeys[1][1] = this.sessKeys[0][1]
      this.sessKeys[0] = [
          this.their_y ?
              new this.dhSession(this.our_dh, this.their_y) : null
        , this.their_old_y ?
              new this.dhSession(this.our_dh, this.their_old_y) : null
      ]

    },

    rotateTheirKeys: function (their_y) {

      // increment their keyid
      this.their_keyid += 1

      // reveal old mac keys
      var self = this
      this.sessKeys.forEach(function (sk) {
        if (sk[1] && sk[1].sendmacused) self.oldMacKeys.push(sk[1].sendmac)
        if (sk[1] && sk[1].rcvmacused) self.oldMacKeys.push(sk[1].rcvmac)
      })

      // rotate their keys / session
      this.their_old_y = this.their_y
      this.sessKeys[0][1] = this.sessKeys[0][0]
      this.sessKeys[1][1] = this.sessKeys[1][0]

      // new keys / sessions
      this.their_y = their_y
      this.sessKeys[0][0] = new this.dhSession(this.our_dh, this.their_y)
      this.sessKeys[1][0] = new this.dhSession(this.our_old_dh, this.their_y)

    },

    prepareMsg: function (msg) {
      if (this.msgstate !== STATES.MSGSTATE_ENCRYPTED || this.their_keyid === 0)
        return this.error('Not ready to encrypt.')

      var sessKeys = this.sessKeys[1][0]
      sessKeys.send_counter += 1

      var ctr = HLP.packCtr(sessKeys.send_counter)

      var send = STATES.OTR_VERSION_2 + '\x03'  // version and type
      send += '\x00'  // flag
      send += HLP.packINT(this.our_keyid - 1)
      send += HLP.packINT(this.their_keyid)
      send += HLP.packMPI(this.our_dh.publicKey)
      send += ctr.substring(0, 8)
      send += HLP.packData(HLP.makeAes(msg, sessKeys.sendenc, ctr))
      send += HLP.make1Mac(send, sessKeys.sendmac)
      send += HLP.packData(this.oldMacKeys.splice(0).join(''))

      sessKeys.sendmacused = true

      send = HLP.wrapMsg(send, this.fragment_size)
      if (send[0]) return this.error(send[0])
      return send[1]
    },

    handleDataMsg: function (msg) {
      var vt = msg.version + msg.type

      var types = ['BYTE', 'INT', 'INT', 'MPI', 'CTR', 'DATA', 'MAC', 'DATA']
      msg = HLP.splitype(types, msg.msg)

      // ignore flag
      var ign = (msg[0] === '\x01')

      if (this.msgstate !== STATES.MSGSTATE_ENCRYPTED || msg.length !== 8) {
        if (!ign) this.error('Received an unreadable encrypted message.', true)
        return
      }

      var our_keyid = this.our_keyid - HLP.readLen(msg[2])
      var their_keyid = this.their_keyid - HLP.readLen(msg[1])

      if (our_keyid < 0 || our_keyid > 1) {
        if (!ign) this.error('Not of our latest keys.', true)
        return
      }

      var our_dh =  our_keyid ? this.our_old_dh : this.our_dh

      if (their_keyid < 0 || their_keyid > 1) {
        if (!ign) this.error('Not of your latest keys.', true)
        return
      }

      var their_y = their_keyid ? this.their_old_y : this.their_y

      if (their_keyid === 1 && !their_y) {
        if (!ign) this.error('Do not have that key.')
        return
      }

      var sessKeys = this.sessKeys[our_keyid][their_keyid]

      var ctr = HLP.unpackCtr(msg[4])
      if (ctr <= sessKeys.rcv_counter) {
        if (!ign) this.error('Counter in message is not larger.')
        return
      }
      sessKeys.rcv_counter = ctr

      // verify mac
      vt += msg.slice(0, 6).join('')
      var vmac = HLP.make1Mac(vt, sessKeys.rcvmac)

      if (msg[6] !== vmac) {
        if (!ign) this.error('MACs do not match.')
        return
      }
      sessKeys.rcvmacused = true

      var out = HLP.decryptAes(
          msg[5].substring(4)
        , sessKeys.rcvenc
        , HLP.padCtr(msg[4])
      )

      if (!our_keyid) this.rotateOurKeys()
      if (!their_keyid) this.rotateTheirKeys(HLP.readMPI(msg[3]))

      // parse TLVs
      var ind = out.indexOf('\x00')
      if (~ind) {
        this.handleTLVs(out.substring(ind + 1))
        out = out.substring(0, ind)
      }

      return out
    },

    handleTLVs: function (tlvs) {
      var type, len, msg
      for (; tlvs.length; ) {
        type = HLP.unpackSHORT(tlvs.substr(0, 2))
        len = HLP.unpackSHORT(tlvs.substr(2, 2))

        // TODO: handle pathological cases better
        if (!len || (len + 4) > tlvs.length) break

        msg = tlvs.substr(4, len)

        // SMP
        if (type > 1 && type < 7)
          this.sm.handleSM({ msg: msg, type: type })

        tlvs = tlvs.substring(4 + len)
      }
    },

    sendQueryMsg: function () {
      var versions = {}
        , msg = '?OTR'

      if (this.ALLOW_V2) versions['2'] = true

      // but we don't allow v1
      if (versions['1']) msg += '?'

      var vs = Object.keys(versions)
      if (vs.length) {
        msg += 'v'
        vs.forEach(function (v) {
          if (v !== '1') msg += v
        })
        msg += '?'
      }

      this.sendMsg(msg, true)
    },

    sendMsg: function (msg, internal) {
      if (!internal) {  // a user or sm msg

        switch (this.msgstate) {
          case STATES.MSGSTATE_PLAINTEXT:
            if (this.REQUIRE_ENCRYPTION) {
              this.storedMgs.push(msg)
              this.sendQueryMsg()
              return
            }
            if (this.SEND_WHITESPACE_TAG) {
              msg += STATES.WHITESPACE_TAG  // 16 byte tag
              if (this.ALLOW_V2) msg += STATES.WHITESPACE_TAG_V2
            }
            break
          case STATES.MSGSTATE_FINISHED:
            this.storedMgs.push(msg)
            this.error('Message cannot be sent at this time.')
            return
          default:
            msg = this.prepareMsg(msg)
        }

      }
      if (msg) this.iocb(msg)
    },

    receiveMsg: function (msg) {

      // parse type
      msg = ParseOTR.parseMsg(this, msg)

      if (!msg) return

      switch (msg.cls) {
        case 'error':
          this.error(msg.msg)
          return
        case 'ake':
          this.ake.handleAKE(msg)
          return
        case 'data':
          msg.msg = this.handleDataMsg(msg)
          break
        case 'query':
          if (msg.version !== '2') return
          if (this.msgstate === STATES.MSGSTATE_ENCRYPTED) this.akeInit()
          this.ake.initiateAKE()
          break
        default:
          if ( this.REQUIRE_ENCRYPTION ||
               this.msgstate !== STATES.MSGSTATE_PLAINTEXT
          ) this.error('Received an unencrypted message.')

          // received a plaintext message
          // stop sending the whitespace tag
          this.SEND_WHITESPACE_TAG = false

          // received a whitespace tag
          if ( this.WHITESPACE_START_AKE &&
               ~msg.ver.indexOf(STATES.OTR_VERSION_2)
          ) this.ake.initiateAKE()
      }

      if (msg.msg) this.uicb(msg.msg)
    },

    error: function (err, send) {
      if (send) {
        err = '?OTR Error:' + err
        this.sendMsg(err, true)
        return
      }
      // should cb be a node style function (err, msg) {}
      // or just instanceof Error ?
      this.uicb(err)
    },

    sendStored: function () {
      var self = this
      ;(this.storedMgs.splice(0)).forEach(function (msg) {
        self.sendMsg(msg)
      })
    },

    endOtr: function () {
      if (this.msgstate === STATES.MSGSTATE_ENCRYPTED) {
        this.sendMsg('\x00\x01\x00\x00')
        this.sm = null
      }
      this.msgstate = STATES.MSGSTATE_PLAINTEXT
    }

  }

}).call(this)