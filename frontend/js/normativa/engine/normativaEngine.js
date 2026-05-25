/**
 * normativaEngine.js — Motor de resolución normativa PilotPay v2
 *
 * Versión 2: override system hardened. Cambios respecto a v1:
 *   - tipo_override respetado: adiciona/complementa no marcan la base como inoperativa
 *   - Múltiples overrides sobre el mismo target: acumulados en array (no last-writer-wins)
 *   - condicionado_a evaluado con tres estados: activa / inactiva / desconocida
 *   - antigüedad en ctx: filtra reglas por _meta.antiguedad_rango si se proporciona
 *   - getRosterActivo excluye reglas informativas (_meta.es_informativa: true)
 *   - Nuevo tipo 'complementa'
 *   - resolveContext adjunta _resolution a cada regla devuelta
 *
 * Dependencias (cargar antes en este orden):
 *   norm_layers.js       → NORM_LAYERS, NORM_CONDICIONES, NORM_TIPOS_OVERRIDE
 *   norm_docs.js         → NORM_DOCS
 *   norm_ambiguedades.js → NORM_AMBIGUEDADES
 *   convenio_general.js  → CC_REGLAS
 *   acta_cierre.js       → ACTA_REGLAS
 *   base_mad.js          → MAD_REGLAS
 *   base_tfn.js          → TFN_REGLAS
 *   base_lpa.js          → LPA_REGLAS
 *   productividad_2026.js → PROD_REGLAS
 */

'use strict';

var NormativaEngine = (function () {

  // ── Índice unificado ──────────────────────────────────────────

  var _allRules = null;

  function _buildIndex() {
    if (_allRules) return;
    var sources = [
      typeof CC_REGLAS   !== 'undefined' ? CC_REGLAS   : [],
      typeof ACTA_REGLAS !== 'undefined' ? ACTA_REGLAS : [],
      typeof MAD_REGLAS  !== 'undefined' ? MAD_REGLAS  : [],
      typeof TFN_REGLAS  !== 'undefined' ? TFN_REGLAS  : [],
      typeof LPA_REGLAS  !== 'undefined' ? LPA_REGLAS  : [],
      typeof PROD_REGLAS !== 'undefined' ? PROD_REGLAS : [],
    ];
    _allRules = {};
    sources.forEach(function (arr) {
      arr.forEach(function (r) { _allRules[r.id] = r; });
    });
  }

  // ── Helpers de filtrado ───────────────────────────────────────

  function _parseDate(str) {
    if (!str) return null;
    var p = str.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function _isVigente(regla, fecha) {
    var desde = _parseDate(regla._meta.vigencia_desde);
    var hasta  = _parseDate(regla._meta.vigencia_hasta);
    if (desde && fecha < desde) return false;
    if (hasta && fecha >= hasta) return false;
    return true;
  }

  function _matchesBases(regla, base) {
    if (!base) return true;
    return regla._meta.bases.indexOf(base) !== -1;
  }

  function _matchesGrupo(regla, grupo) {
    if (!grupo) return true;
    return regla._meta.grupos.indexOf(grupo) !== -1;
  }

  function _matchesAntiguedad(regla, antiguedad_años) {
    var rango = regla._meta.antiguedad_rango;
    if (!rango) return true;
    if (antiguedad_años === null || antiguedad_años === undefined) return true;
    if (antiguedad_años < rango.min) return false;
    if (rango.max !== null && antiguedad_años >= rango.max) return false;
    return true;
  }

  // ── Evaluación de condiciones ─────────────────────────────────

  function _evaluarCondicion(condId, activas, inactivas) {
    if (!condId) return null;
    var label = (typeof NORM_CONDICIONES !== 'undefined' && NORM_CONDICIONES[condId])
      ? NORM_CONDICIONES[condId] : condId;
    var estado;
    if (activas.indexOf(condId)   !== -1) estado = 'activa';
    else if (inactivas.indexOf(condId) !== -1) estado = 'inactiva';
    else                                       estado = 'desconocida';
    return { id: condId, estado: estado, label: label };
  }

  // ── Determinación de estado ───────────────────────────────────

  /**
   * Orden de prioridad de tipos de override:
   *   sustituye > suspende > adiciona / complementa
   *
   * Semántica de operatividad:
   *   sustituida  → operativa: false (reemplazada)
   *   suspendida  → operativa: false (bloqueada temporalmente)
   *   condicionada → operativa: true | false | 'desconocida' (según estado condición)
   *   ampliada    → operativa: true (base intacta, con añadidos)
   *   activa      → operativa: true
   */
  function _determinarEstado(modificadores, condicion) {
    var tipos = modificadores.map(function (m) { return m.tipo; });

    if (tipos.indexOf('sustituye') !== -1) return 'sustituida';
    if (tipos.indexOf('suspende')  !== -1) return 'suspendida';

    // Si la regla tiene condición propia no satisfecha y nadie la suspende/sustituye:
    if (condicion && condicion.estado !== 'activa') return 'condicionada';

    if (tipos.length > 0) return 'ampliada'; // adiciona o complementa
    return 'activa';
  }

  function _determinarOperativa(estado, condicion) {
    if (estado === 'sustituida' || estado === 'suspendida') return false;
    if (estado === 'condicionada') {
      if (!condicion)                                return true; // no debería pasar
      if (condicion.estado === 'activa')             return true;
      if (condicion.estado === 'inactiva')           return false;
      return 'desconocida';
    }
    return true; // 'activa' o 'ampliada'
  }

  // ── API pública ───────────────────────────────────────────────

  /**
   * resolveContext(ctx) → [regla, ...]
   *
   * ctx = {
   *   base:                 string,        // 'MAD' | 'TFN' | 'LPA'
   *   grupo:                string,        // 'CMD' | 'COP' | 'SCC' | 'TCP' | 'CC'
   *   fecha:                'YYYY-MM-DD',  // default: hoy
   *   categorias:           string[],      // opcional — filtro de categoría
   *   antiguedad_años:      number,        // opcional — filtra por _meta.antiguedad_rango
   *   condicionesActivas:   string[],      // condiciones verificadas como true
   *   condicionesInactivas: string[],      // condiciones verificadas como false
   * }
   *
   * Cada regla devuelta tiene _resolution adjunto:
   * {
   *   estado:        'activa' | 'ampliada' | 'condicionada' | 'suspendida' | 'sustituida'
   *   operativa:     true | false | 'desconocida'
   *   modificadores: [{ reglaId, tipo, temporal, vigencia_hasta }]
   *   modifica_a:    [{ reglaId, tipo }]
   *   condicion:     null | { id, estado, label }
   * }
   *
   * Las reglas suspendidas/sustituidas se incluyen con operativa:false para
   * permitir mensajes del tipo "esta regla volverá cuando expire el acuerdo".
   */
  function resolveContext(ctx) {
    _buildIndex();

    var base               = ctx.base              || null;
    var grupo              = ctx.grupo             || null;
    var fecha              = ctx.fecha ? new Date(ctx.fecha) : new Date();
    var cats               = ctx.categorias        || null;
    var antiguedad         = (ctx.antiguedad_años != null) ? ctx.antiguedad_años : null;
    var condicionesActivas   = ctx.condicionesActivas   || [];
    var condicionesInactivas = ctx.condicionesInactivas || [];

    // 1. Filtrar reglas vigentes para este contexto
    var aplicables = [];
    Object.keys(_allRules).forEach(function (id) {
      var r = _allRules[id];
      if (!_isVigente(r, fecha))                    return;
      if (!_matchesBases(r, base))                  return;
      if (!_matchesGrupo(r, grupo))                 return;
      if (cats && cats.indexOf(r.categoria) === -1) return;
      if (!_matchesAntiguedad(r, antiguedad))       return;
      aplicables.push(r);
    });

    // 2. Construir mapa acumulado de modificadores y su inverso
    //    modifierMap[targetId] = [{ reglaId, tipo, temporal, vigencia_hasta }]
    //    inverseMap[sourceId]  = [{ reglaId (target), tipo }]
    var modifierMap = {};
    var inverseMap  = {};

    aplicables.forEach(function (r) {
      if (!r._meta.overrides || !r._meta.overrides.length) return;
      var tipo = r._meta.tipo_override;
      r._meta.overrides.forEach(function (targetId) {
        if (!modifierMap[targetId]) modifierMap[targetId] = [];
        modifierMap[targetId].push({
          reglaId:        r.id,
          tipo:           tipo,
          temporal:       !!r._meta.temporal,
          vigencia_hasta: r._meta.vigencia_hasta || null,
        });
        if (!inverseMap[r.id]) inverseMap[r.id] = [];
        inverseMap[r.id].push({ reglaId: targetId, tipo: tipo });
      });
    });

    // 3. Adjuntar _resolution a cada regla
    return aplicables.map(function (r) {
      var out        = Object.assign({}, r);
      var mods       = modifierMap[r.id] || [];
      var modifica_a = inverseMap[r.id]  || [];
      var condicion  = _evaluarCondicion(r._meta.condicionado_a, condicionesActivas, condicionesInactivas);
      var estado     = _determinarEstado(mods, condicion);
      var operativa  = _determinarOperativa(estado, condicion);

      out._resolution = {
        estado:       estado,
        operativa:    operativa,
        modificadores: mods,
        modifica_a:    modifica_a,
        condicion:     condicion,
      };

      return out;
    });
  }

  /**
   * getRegla(id) → regla | null
   * Devuelve la regla bruta por ID sin contexto ni _resolution.
   */
  function getRegla(id) {
    _buildIndex();
    return _allRules[id] || null;
  }

  /**
   * getRosterActivo(base, fecha) → regla | null
   *
   * Devuelve la regla de roster vigente para una base en una fecha.
   * Excluye reglas con _meta.es_informativa: true (p.ej. lpa_antes_mayo_2026).
   * Prefiere capas superiores: L3 > L2 > L1.
   * No incluye _resolution — usar resolveContext si se necesita.
   */
  function getRosterActivo(base, fecha) {
    _buildIndex();
    var d = fecha ? new Date(fecha) : new Date();
    var rosterRules = Object.keys(_allRules)
      .map(function (id) { return _allRules[id]; })
      .filter(function (r) {
        return r.categoria === 'roster'
          && !r._meta.es_informativa
          && _matchesBases(r, base)
          && _isVigente(r, d)
          && r._meta.condicionado_a === null;
      });

    var layerOrder = { L3_ACUERDO: 3, L2_ACTA: 2, L1_CC: 1 };
    rosterRules.sort(function (a, b) {
      return (layerOrder[b._meta.capa] || 0) - (layerOrder[a._meta.capa] || 0);
    });

    return rosterRules[0] || null;
  }

  /**
   * getDocStatus(docId) → { doc, vigente, diasRestantes } | null
   */
  function getDocStatus(docId) {
    if (typeof NORM_DOCS === 'undefined') return null;
    var doc = null;
    for (var i = 0; i < NORM_DOCS.length; i++) {
      if (NORM_DOCS[i].id === docId) { doc = NORM_DOCS[i]; break; }
    }
    if (!doc) return null;
    var hoy    = new Date();
    var desde  = _parseDate(doc.vigencia_desde);
    var hasta  = _parseDate(doc.vigencia_hasta);
    var vigente = (!desde || hoy >= desde) && (!hasta || hoy < hasta);
    var diasRestantes = null;
    if (hasta && vigente) {
      diasRestantes = Math.ceil((hasta - hoy) / 86400000);
    }
    return { doc: doc, vigente: vigente, diasRestantes: diasRestantes };
  }

  /**
   * getAmbiguedadesActivas(filtro) → [ambigüedad, ...]
   * filtro = { bases[], grupos[], urgencia }
   */
  function getAmbiguedadesActivas(filtro) {
    if (typeof NORM_AMBIGUEDADES === 'undefined') return [];
    filtro = filtro || {};
    return NORM_AMBIGUEDADES.filter(function (a) {
      if (a.estado !== 'abierta') return false;
      if (filtro.bases && filtro.bases.length) {
        var ok = filtro.bases.some(function (b) { return a.bases.indexOf(b) !== -1; });
        if (!ok) return false;
      }
      if (filtro.grupos && filtro.grupos.length) {
        var okG = filtro.grupos.some(function (g) { return a.grupos.indexOf(g) !== -1; });
        if (!okG) return false;
      }
      if (filtro.urgencia && a.urgencia !== filtro.urgencia) return false;
      return true;
    });
  }

  /**
   * isCondicionActiva(condicionId, condicionesActivas) → boolean
   */
  function isCondicionActiva(condicionId, condicionesActivas) {
    if (!condicionId) return true;
    if (!condicionesActivas || !condicionesActivas.length) return false;
    return condicionesActivas.indexOf(condicionId) !== -1;
  }

  /**
   * getFuenteDisplay(regla) → string legible para UI
   */
  function getFuenteDisplay(regla) {
    if (!regla || !regla._meta) return 'Fuente desconocida';
    var m    = regla._meta;
    var capa = m.capa    || '';
    var art  = m.articulo || '';
    var doc  = m.doc     || '';
    if (capa === 'L1_CC')    return 'CC BCSA 2026' + (art ? ' — ' + art : '');
    if (capa === 'L2_ACTA')  return 'Acta de Cierre 28/11/2025' + (art ? ' — ' + art : '');
    if (capa === 'L3_ACUERDO') {
      var docLabels = {
        'roster_mad_tfn_2026': 'Acuerdo Roster MAD+TFN',
        'roster_tfn_5_3_2026': 'Acuerdo Roster TFN 5+3',
        'roster_lpa_2026':     'Acuerdo Roster LPA',
        'productividad_2026':  'Acuerdo Productividad 2026',
        'cc_bcsa2026':         'CC BCSA 2026',
        'acta_cierre_2025':    'Acta de Cierre 2025',
      };
      return (docLabels[doc] || doc) + (art ? ' — ' + art : '');
    }
    return capa + (art ? ' — ' + art : '');
  }

  /**
   * getReglasByCategoria(categoria, ctx) → [regla, ...]
   */
  function getReglasByCategoria(categoria, ctx) {
    var c = Object.assign({}, ctx || {});
    c.categorias = [categoria];
    return resolveContext(c);
  }

  /**
   * hasAmbiguedad(regla) → ambigüedad | null
   */
  function hasAmbiguedad(regla) {
    if (!regla || !regla._meta || !regla._meta.ambiguedad_id) return null;
    if (typeof NORM_AMBIGUEDADES === 'undefined') return null;
    for (var i = 0; i < NORM_AMBIGUEDADES.length; i++) {
      if (NORM_AMBIGUEDADES[i].id === regla._meta.ambiguedad_id) {
        return NORM_AMBIGUEDADES[i];
      }
    }
    return null;
  }

  /**
   * getResolucionDisplay(resolution) → { etiqueta, clase, icono, operativa, condicion }
   *
   * Traduce _resolution a valores listos para UI.
   * El consumidor no necesita conocer los estados internos del engine.
   */
  function getResolucionDisplay(resolution) {
    if (!resolution) return null;
    var mapa = {
      'activa':      { etiqueta: 'Vigente',     clase: 'nr-activa',       icono: '✓'  },
      'ampliada':    { etiqueta: 'Ampliada',     clase: 'nr-ampliada',     icono: '+'  },
      'condicionada':{ etiqueta: 'Condicionada', clase: 'nr-condicionada', icono: '?'  },
      'suspendida':  { etiqueta: 'Suspendida',   clase: 'nr-suspendida',   icono: '⏸' },
      'sustituida':  { etiqueta: 'Sustituida',   clase: 'nr-sustituida',   icono: '↻'  },
    };
    var d = mapa[resolution.estado] || { etiqueta: resolution.estado, clase: '', icono: '' };
    return {
      etiqueta:  d.etiqueta,
      clase:     d.clase,
      icono:     d.icono,
      operativa: resolution.operativa,
      condicion: resolution.condicion,
    };
  }

  /**
   * getReglasSuspendidas(ctx) → [regla, ...]
   *
   * Atajo para obtener solo las reglas que están suspendidas o sustituidas en el contexto.
   * Útil para UI de tipo "¿qué reglas están temporalmente inactivas?".
   */
  function getReglasSuspendidas(ctx) {
    return resolveContext(ctx).filter(function (r) {
      return r._resolution &&
        (r._resolution.estado === 'suspendida' || r._resolution.estado === 'sustituida');
    });
  }

  /**
   * resetIndex() → void
   * Fuerza reconstrucción del índice. Útil en tests o si se cargan fuentes dinámicamente.
   */
  function resetIndex() {
    _allRules = null;
  }

  // ── Expose ────────────────────────────────────────────────────

  return {
    resolveContext:         resolveContext,
    getRegla:               getRegla,
    getRosterActivo:        getRosterActivo,
    getDocStatus:           getDocStatus,
    getAmbiguedadesActivas: getAmbiguedadesActivas,
    isCondicionActiva:      isCondicionActiva,
    getFuenteDisplay:       getFuenteDisplay,
    getReglasByCategoria:   getReglasByCategoria,
    hasAmbiguedad:          hasAmbiguedad,
    getResolucionDisplay:   getResolucionDisplay,
    getReglasSuspendidas:   getReglasSuspendidas,
    resetIndex:             resetIndex,
  };

})();
