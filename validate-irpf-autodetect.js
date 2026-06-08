// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT DE VALIDACIÓN — IRPF AUTO-DETECT Fase 1 MVP
// ═══════════════════════════════════════════════════════════════════════════
//
// INSTRUCCIONES:
// 1. Abrir PilotPay en Chrome (local: file:// o localhost)
// 2. Login como usuario
// 3. Abrir DevTools (F12) → Console
// 4. Copiar TODO este script y pegar en consola
// 5. Presionar Enter
//
// El script validará que IRPF AUTO-DETECT esté funcionando correctamente.
//
// ═══════════════════════════════════════════════════════════════════════════

console.clear();
console.log('═══════════════════════════════════════════════════');
console.log('VALIDACIÓN IRPF AUTO-DETECT — Fase 1 MVP');
console.log('═══════════════════════════════════════════════════');
console.log('');

// ── 1. VERIFICAR CONSTANTES ─────────────────────────────────────────────────

console.log('1️⃣  CONSTANTES CONFIGURABLES');
console.log('─'.repeat(55));

try {
  console.log('   IRPF_DETECTION_THRESHOLD:', IRPF_DETECTION_THRESHOLD, '(esperado: 0.5)');
  console.log('   IRPF_MATCH_TOLERANCE:', IRPF_MATCH_TOLERANCE, '(esperado: 0.01)');
  console.log('   IRPF_MIN_VALID:', IRPF_MIN_VALID, '(esperado: 10)');
  console.log('   IRPF_MAX_VALID:', IRPF_MAX_VALID, '(esperado: 50)');
  console.log('   ✅ Todas las constantes definidas\n');
} catch (e) {
  console.error('   ❌ Error: Constantes no definidas', e.message, '\n');
}

// ── 2. VERIFICAR FUNCIONES ──────────────────────────────────────────────────

console.log('2️⃣  FUNCIONES CREADAS');
console.log('─'.repeat(55));

const funciones = {
  'detectIRPFDifference': typeof detectIRPFDifference === 'function',
  'renderIRPFWarning': typeof renderIRPFWarning === 'function',
  'recalcWithDetectedIRPF': typeof window.recalcWithDetectedIRPF === 'function'
};

for (const [nombre, existe] of Object.entries(funciones)) {
  console.log(`   ${existe ? '✅' : '❌'} ${nombre}`);
}
console.log('');

// ── 3. VERIFICAR DETECCIÓN (si hay nómina cargada) ──────────────────────────

console.log('3️⃣  DETECCIÓN IRPF');
console.log('─'.repeat(55));

if (typeof nomDataCached !== 'undefined' && nomDataCached && nomDataCached._nominaV2) {
  try {
    const metadata = detectIRPFDifference(nomDataCached);

    if (metadata) {
      console.log('   ✅ Diferencia detectada:');
      console.log('      IRPF actual:', metadata.irpfActual.toFixed(2), '%');
      console.log('      IRPF detectado:', metadata.irpfDetectado.toFixed(2), '%');
      console.log('      Diferencia:', metadata.diferencia.toFixed(2), 'puntos');
      console.log('      Supera umbral:', metadata.diferencia >= IRPF_DETECTION_THRESHOLD ? 'SÍ' : 'NO');
    } else {
      console.log('   ℹ️  Sin diferencia significativa o ya coinciden');

      if (nomDataCached._nominaV2.deducciones && nomDataCached._nominaV2.deducciones.irpf_pct != null) {
        const irpfDetectado = nomDataCached._nominaV2.deducciones.irpf_pct;
        const irpfActual = parseFloat(document.getElementById('irpf')?.value || 0);
        const diferencia = Math.abs(irpfDetectado - irpfActual);

        console.log('      IRPF actual:', irpfActual.toFixed(2), '%');
        console.log('      IRPF detectado:', irpfDetectado.toFixed(2), '%');
        console.log('      Diferencia:', diferencia.toFixed(2), 'puntos (< umbral)');
      }
    }
  } catch (e) {
    console.error('   ❌ Error en detección:', e.message);
  }
} else {
  console.log('   ⚠️  No hay nómina cargada (nomDataCached vacío)');
  console.log('      Cargar una nómina PDF para probar detección');
}
console.log('');

// ── 4. VERIFICAR AUDITORÍA GUARDADA ─────────────────────────────────────────

console.log('4️⃣  AUDITORÍA GUARDADA (última)');
console.log('─'.repeat(55));

try {
  const userId = typeof currentUser !== 'undefined' ? currentUser : 'ESH';
  const audits = JSON.parse(localStorage.getItem('pilotpay:' + userId + ':audit_history_v1') || '[]');

  if (audits.length === 0) {
    console.log('   ⚠️  Sin auditorías guardadas');
    console.log('      Guardar una auditoría para validar persistencia\n');
  } else {
    const last = audits[0];
    console.log('   ID:', last.id);
    console.log('   Fecha:', last.fechaAuditoria);
    console.log('   Estado:', last.estado);
    console.log('');

    if (last.irpfMetadata) {
      console.log('   ✅ irpfMetadata existe:');
      console.log('      irpfDetectado:', last.irpfMetadata.irpfDetectado, '%');
      console.log('      irpfUsado:', last.irpfMetadata.irpfUsado, '%');
      console.log('      diferencia:', last.irpfMetadata.diferencia.toFixed(2), 'puntos');
      console.log('      coincideConDetectado:', last.irpfMetadata.coincideConDetectado);
    } else {
      console.log('   ℹ️  Sin irpfMetadata');
      console.log('      (Normal si nómina no tiene IRPF detectado o es auditoría antigua)');
    }
  }
} catch (e) {
  console.error('   ❌ Error al leer auditoría:', e.message);
}
console.log('');

// ── 5. VERIFICAR PERFIL NO CAMBIA ───────────────────────────────────────────

console.log('5️⃣  PERFIL FISCAL');
console.log('─'.repeat(55));

try {
  if (typeof profileData !== 'undefined' && profileData) {
    console.log('   IRPF perfil actual:', profileData.irpf, '%');
    console.log('   ℹ️  Fase 1 MVP NO modifica profileData.irpf');
    console.log('      (El IRPF detectado solo afecta a la auditoría actual)');
  } else {
    console.log('   ⚠️  profileData no disponible');
  }
} catch (e) {
  console.error('   ❌ Error:', e.message);
}
console.log('');

// ── RESUMEN FINAL ───────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('INSTRUCCIONES DE TESTING MANUAL');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('📝 TEST 1: Diferencia IRPF > 0.5%');
console.log('   1. Ir a Variables → introducir datos');
console.log('   2. Calcular con IRPF manual (ej: 32%)');
console.log('   3. Cargar PDF nómina con IRPF diferente (ej: 34.35%)');
console.log('   4. ✅ Debe aparecer aviso azul con diferencia');
console.log('   5. ✅ Debe aparecer botón "Recalcular con IRPF real"');
console.log('');
console.log('📝 TEST 2: Usuario recalcula');
console.log('   1. Continuar desde TEST 1');
console.log('   2. Click en botón "Recalcular con IRPF real"');
console.log('   3. ✅ Input #irpf debe actualizarse a IRPF detectado');
console.log('   4. ✅ Comparativa debe re-renderizarse');
console.log('   5. ✅ Aviso debe desaparecer');
console.log('   6. ✅ Discrepancias IRPF artificiales deben eliminarse');
console.log('');
console.log('📝 TEST 3: Guardar auditoría (recalculada)');
console.log('   1. Continuar desde TEST 2');
console.log('   2. Guardar auditoría');
console.log('   3. Ejecutar este script de nuevo');
console.log('   4. ✅ irpfMetadata.coincideConDetectado debe ser true');
console.log('   5. ✅ irpfMetadata.irpfUsado === irpfDetectado');
console.log('');
console.log('📝 TEST 4: Guardar auditoría (NO recalculada)');
console.log('   1. Repetir TEST 1 pero NO clicar "Recalcular"');
console.log('   2. Guardar auditoría directamente');
console.log('   3. Ejecutar este script de nuevo');
console.log('   4. ✅ irpfMetadata.coincideConDetectado debe ser false');
console.log('   5. ✅ irpfMetadata.irpfUsado !== irpfDetectado');
console.log('');
console.log('📝 TEST 5: Diferencia IRPF < 0.5%');
console.log('   1. Calcular con IRPF 34.00%');
console.log('   2. Cargar PDF con IRPF 34.35%');
console.log('   3. ✅ NO debe aparecer aviso (diferencia < umbral)');
console.log('   4. ✅ irpfMetadata debe existir con diferencia pequeña');
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('VALIDACIÓN COMPLETADA ✅');
console.log('═══════════════════════════════════════════════════');
