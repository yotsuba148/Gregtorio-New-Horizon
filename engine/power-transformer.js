/* 单方块变压器：只需要记住「特殊面」和「升压/降压」两件事。
   降压：特殊面进高压，其余三面出低压。
   升压：其余三面进低压，特殊面出高压。
   这一层的存在只是为了不让变压器分支散到物流、覆盖板和窗口三个地方去。 */
(function (root) {
  'use strict';

  function spec(d) {
    return (d && d.transformer) || null;
  }

  function normalFace(v, fallback) {
    return Number.isInteger(v) && v >= 0 && v <= 3 ? v : fallback;
  }

  /* 老存档只有 outFace，第一次遇到变压器时按它补 tfFace，之后只认 tfFace */
  function ensure(m, d) {
    if (!spec(d)) return null;
    if (m.tfMode !== 'up' && m.tfMode !== 'down') m.tfMode = 'down';
    if (!Number.isInteger(m.tfFace) || m.tfFace < 0 || m.tfFace > 3) {
      /* 老存档里 outFace 是出电面，特殊面取它的对面 */
      m.tfFace = (normalFace(m.outFace, 1) + 2) % 4;
    }
    return spec(d);
  }

  function faces(m, d) {
    ensure(m, d);
    var special = normalFace(m.tfFace, 1);
    var others = [0, 1, 2, 3].filter(function (s) { return s !== special; });
    if (m.tfMode === 'up') return { inputs: others, outputs: [special], special: special };
    return { inputs: [special], outputs: others, special: special };
  }

  function volts(m, d) {
    var tf = spec(d) || {};
    var ratio = tf.ratio || 4;
    var down = m.tfMode !== 'up';
    return {
      inVolt: down ? tf.inVolt : tf.outVolt,
      outVolt: down ? tf.outVolt : tf.inVolt,
      inAmps: down ? 1 : ratio,
      outAmps: down ? ratio : 1
    };
  }

  function setMode(m, d, mode) {
    if (!spec(d)) return { ok: false, code: 'NOT_TRANSFORMER' };
    if (mode !== 'up' && mode !== 'down') return { ok: false, code: 'VALUE' };
    ensure(m, d);
    m.tfMode = mode;
    return { ok: true, mode: mode };
  }

  function setFace(m, d, side) {
    if (!spec(d)) return { ok: false, code: 'NOT_TRANSFORMER' };
    if (!Number.isInteger(side) || side < 0 || side > 3) return { ok: false, code: 'VALUE' };
    ensure(m, d);
    m.tfFace = side;
    return { ok: true, face: side };
  }

  function acceptsCover(m, d, side) {
    if (!spec(d)) return true;
    var f = faces(m, d);
    return f.inputs.indexOf(side) < 0;
  }

  root.POWER_TRANSFORMER = {
    ensure: ensure,
    faces: faces,
    volts: volts,
    setMode: setMode,
    setFace: setFace,
    acceptsCover: acceptsCover,
    isTransformer: function (m, d) { return !!spec(d); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
