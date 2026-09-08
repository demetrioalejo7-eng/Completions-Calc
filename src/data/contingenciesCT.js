// Diagramas de contingencia de Coiled Tubing (limpieza / aprisionamiento).
// Mismo modelo de grafo que src/data/contingencies.js (ver esa cabecera).

export const CONTINGENCIES_CT = [
  {
    id: 'definir-causa-aprisionamiento-ct',
    order: 1,
    title: 'Definir causa del aprisionamiento de CT',
    legend: [],
    notes: [],
    start: 'start',
    nodes: {
      start: {
        type: 'start',
        text: 'Sobretensiona con MSPOOH y no se observa movimiento efectivo de tubería en ambos sentidos. Definir causa / naturaleza del aprisionamiento.',
        next: 'd1',
      },
      d1: {
        type: 'decision',
        text: '¿Qué línea de indicios aplica?',
        branches: [
          { label: 'Indicios mecánicos', to: 'n_mecanico' },
          { label: 'Indicios de limpieza', to: 'n_limpieza' },
          { label: 'Indicios en superficie', to: 'n_superficie' },
        ],
      },
      n_mecanico: {
        type: 'end',
        tone: 'escalate',
        text: 'Problema mecánico. Indicadores: historial de fractura y P&P (tapones slim); información de perforación y subsuelo; sólidos anómalos en retorno (virutas, cutting, etc.); comportamiento de BHA (incremento de presión directa, pérdida de peso); sólidos y/o herramientas en pesca. Evaluar con ingeniería los pasos a seguir.',
      },
      n_limpieza: {
        type: 'end',
        tone: 'ok',
        text: 'Problema en limpieza (causa más probable). Indicadores: retornos de sólidos versus avance de limpieza; circulación de baches viscosos; comportamiento de presión anular y purgas; cantidad de tapones contactados; calidad de fluido en circuito (Re, viscosidad, etc.).',
        link: { to: 'coiled-tubing-aprisionado', label: 'Ir al flujograma de Coiled Tubing Aprisionado →' },
      },
      n_superficie: {
        type: 'end',
        tone: 'escalate',
        text: 'Problema en superficie. Indicadores: equipamiento (inyector, stripper, BOP); si varía el punto de aprisionamiento; cálculo de estiramiento (cercano a boca de pozo); condición de cañería (colapso/deformación); formación de hidratos. Confirmar el estado del Stripper (principal causa mapeada en superficie).',
      },
    },
  },

  {
    id: 'coiled-tubing-aprisionado',
    order: 2,
    title: 'Coiled Tubing aprisionado',
    legend: [
      'Datos con los que se debe contar (pre-operativa): fabricante de la tubería y capacidades (presiones y tensión); capacidad de tiro/empuje del inyector; capacidad de bombeo; máxima capacidad de bombeo por MDF y por VMC; tipo de tapones a lavar / condición de tapón barrera; características de fresa/jet; calibración y pinado de desconector hidráulico; calibración de sub de circulación (si estuviese montado); profundidad de aprisionamiento; cantidad de arena teórica de referencia (capacidad de casing lleno); cantidad de etapas "sobredesplazadas"; reología del fluido del circuito ideal teórica; condiciones de subsuelo y restricciones confirmadas durante la fractura; análisis de perfil de presiones ISIP; análisis de velocidades y pesos de avance según simulación; disponibilidad de trazadores; procedimiento de purgas de FPDO asignado.',
      'Datos importantes durante la operación con CTU: profundidad de aprisionamiento; cantidad de arena recuperada comparado con teórica; cantidad de tapones contactados, recortes/pastillas en retornos; reología del fluido del circuito; análisis de velocidades y pesos de avance (simulación versus real); presiones de purgas; condición de bombeo (caudal/presiones).',
      'En paralelo: solicitar condición de fatiga, capacidad de tiro a la profundidad actual, y elaboración de programa. Definir qué maniobra previa se estaba ejecutando.',
    ],
    notes: [
      'Con respecto al peso normal de sacada.',
      'Si existe restricción conocida, evaluar sacar lavando hasta arriba de la misma con MDF.',
      'Maniobras A (pozo SIN circulación): cerrar anular de pozo y circular por MDF para intentar mover cañería. Circular hasta estabilizar presión de anular. Asentar y tensionar con hasta el 70% de la capacidad máxima. Estar alerta ante la posibilidad de tener "flujo cruzado" (retorno de producción del pozo pero no del fluido bombeado). Realizar bombeo Bullheading por anular: asentar y tensionar con hasta el 70% de la capacidad máxima; analizar capacidad de bombeo máxima disponible.',
      'Maniobras B (pozo CON circulación): bombeo de fluido con reología diferente, considerando el uso de espumantes, baches viscosos, etc., con el objetivo de remover sólidos que puedan estar ocasionando atrapamiento. Realizar desfogues controlados del espacio anular, por orificio o línea de 2" a pileta; luego del desfogue circular hasta retorno limpio; asentar y tensionar con hasta el 70% de la capacidad máxima y verificar movimiento de sarta.',
      'Maniobras C — bombeo de nitrógeno/espuma: verificar funcionamiento de DFCV antes de iniciar la maniobra. Realizar bombeo de nitrógeno/espuma por directa de CT y/o por anular. El nitrógeno puede ayudar a alivianar la sarta (aumentar la capacidad de tiro en superficie) y a remover los sólidos en el anular. Una vez posicionado el N2 donde se sospeche el aprisionamiento, realizar desfogues controlados por anular, acompañando con tensión y asentamientos.',
      'Maniobras D — bombeo de ácido HCl: verificar funcionamiento de DFCV antes de iniciar la maniobra. Realizar bombeo de HCl por anular/directa. Posicionar el bache de ácido en la zona de aprisionamiento. Dejar reposar. Bombear el mismo a formación para no recibirlo en superficie.',
      'Maniobras E — maniobras menos convencionales para intentar el librado: verificar funcionamiento de DFCV antes de iniciar la maniobra. Realizar bombeo por anular a alto caudal (>12 BPM); será necesario colocar líneas adicionales o bombear por Kill Line; dejar cerrado el anular de pozo y acompañar con maniobras de tensión/asentamientos hasta la máxima capacidad de tiro admisible. Desfogar la directa del CT de forma controlada (evaluar con la compañía de CT los valores de presión para evitar colapsar el caño; puede combinarse con bombeo Bullheading por anular; esta maniobra tiene el riesgo de dañar la DFCV y complicar maniobras futuras). Tensionar hasta el 100% de la capacidad del inyector/CT. Realizar activación de Desconector Hidráulico (previo a esa maniobra es conveniente activar el Sub de Circulación para asegurar buen caudal por directa y evitar taponamientos). Suspender maniobras y dejar reposar el pozo 12 horas; transcurrido ese tiempo, intentar recuperar la sarta. Fluir 1 volumen de pozo a pileta, alineando pozo a manifold y a pileta, abriendo a través de orificio controlado.',
      'Considerar el daño al BHA como dificultad adicional en las próximas maniobras al usar Maniobras D o E.',
    ],
    start: 'start',
    nodes: {
      start: {
        type: 'start',
        text: 'Coil Tubing Aprisionado — causa/naturaleza del aprisionamiento por limpieza (mecánico).',
        next: 'n1',
      },
      n1: { type: 'process', text: 'No sacar sin bombeo.', next: 'n2' },
      n2: { type: 'process', text: 'No sobretensionar más del 20% respecto al peso normal de sacada.', next: 'n3' },
      n3: {
        type: 'process',
        text: '1) Verificar CT libre en sentido RIH, asentar peso. 2) Registrar parámetros de fluidos (TDS, Re, pH), renovar circuito de ser necesario. 3) Usar 50 bbls de trazador/gel para confirmar correcta circulación. 4) Circular pozo (por VMC) hasta verificar retornos limpios a máximo caudal. 5) No realizar purgas con más de 500 psi diferencial. 6) Bombear Reductor de Fricción M-M.',
        next: 'd1',
      },
      d1: {
        type: 'decision',
        text: '¿Correcta circulación (bache/trazador en retorno)?',
        branches: [
          { label: 'SI', to: 'n_a' },
          { label: 'PARCIAL', to: 'n3' },
          { label: 'NO', to: 'maniobrasA' },
        ],
      },
      n_a: { type: 'process', text: 'Realizar prueba de integridad directa, por 5 minutos.', next: 'n_b' },
      n_b: { type: 'process', text: 'Bache m-m. Verificar RIH libre. Realizar Pull-test con 40% del MSPOOH.', next: 'd3' },
      d3: {
        type: 'decision',
        text: '¿Saca tubería hasta peso estable?',
        branches: [
          { label: 'SI', to: 'n_c' },
          { label: 'NO', to: 'n4' },
        ],
      },
      n_c: {
        type: 'process',
        text: 'Circular por VMC: 2 fondos arriba y verificar tubería libre. No sobretensionar. Agregar RF M-M. Controlar velocidad de sacada. (Si existe restricción conocida, evaluar sacar lavando hasta arriba de la misma con MDF.)',
        next: 'd4',
      },
      d4: {
        type: 'decision',
        text: '¿Nuevo aprisionamiento?',
        branches: [
          { label: 'SI', to: 'n4' },
          { label: 'NO', to: 'end_avanzar' },
        ],
      },
      end_avanzar: { type: 'end', tone: 'ok', text: 'Avanzar con el programa de pozo.' },
      n4: {
        type: 'process',
        text: 'Bombeo de bache de limpieza + RF M-M. Asentar CT, alternar entre MDF y VMC.',
        next: 'd2',
      },
      d2: {
        type: 'decision',
        text: '¿Permite movimiento, libera?',
        branches: [
          { label: 'SI', to: 'n_c' },
          { label: 'NO', to: 'n6' },
        ],
      },
      n6: { type: 'process', text: 'Asegurar agua limpia para preparación de baches. Alternar baches con distinta reología.', next: 'maniobrasB' },
      maniobrasA: {
        type: 'process',
        text: 'Maniobras A: pozo SIN circulación. Cerrar anular, circular por MDF. Realizar bombeo Bullheading por E/C. (Ver detalle de Maniobras A en notas.)',
        next: 'd5',
      },
      d5: {
        type: 'decision',
        text: '¿Recupera circulación?',
        branches: [
          { label: 'SI', to: 'n3' },
          { label: 'NO', to: 'n_atrapamiento' },
        ],
      },
      n_atrapamiento: {
        type: 'process',
        text: 'Evaluar posibilidad de atrapamiento diferencial. Analizar perfil de presiones ISIP y evaluar cerrar pozo para estabilizar presiones. Dejar sarta con tensión.',
        next: 'd6',
      },
      maniobrasB: {
        type: 'process',
        text: 'Maniobras B: pozo CON circulación. Bombeo de fluido con reología diferente. Desfogues controlados por E/C. (Ver detalle de Maniobras B en notas.)',
        next: 'd6',
      },
      d6: {
        type: 'decision',
        text: '¿Libera?',
        branches: [
          { label: 'SI', to: 'end_avanzar' },
          { label: 'NO', to: 'n7' },
        ],
      },
      n7: { type: 'process', text: 'Realizar prueba de integridad directa, previo a tensionar.', next: 'n8' },
      n8: { type: 'process', text: 'Llevar el límite de CTU al 80% de la capacidad (realizar GdC); maximizar bombeo.', next: 'd_cde' },
      d_cde: {
        type: 'decision',
        text: '¿Qué maniobra vas a intentar?',
        branches: [
          { label: 'Maniobras C (N2/Espuma)', to: 'maniobrasC' },
          { label: 'Maniobras D (HCl)', to: 'maniobrasD' },
          { label: 'Maniobras E (no convencionales)', to: 'maniobrasE' },
        ],
      },
      maniobrasC: { type: 'process', text: 'Maniobras C: bombeo de N2/Espuma por directa de CT y/o por anular. (Ver detalle de Maniobras C en notas.)', next: 'd7' },
      maniobrasD: { type: 'process', text: 'Maniobras D: bombeo de HCl por directa de CT y/o por anular. (Ver detalle de Maniobras D en notas.) Considerar daño al BHA: dificultad adicional en próximas maniobras.', next: 'd7' },
      maniobrasE: { type: 'process', text: 'Maniobras E: maniobras menos convencionales para intentar el librado. (Ver detalle de Maniobras E en notas.) Considerar daño al BHA: dificultad adicional en próximas maniobras.', next: 'd7' },
      d7: {
        type: 'decision',
        text: '¿Libera?',
        branches: [
          { label: 'SI', to: 'end_avanzar' },
          { label: 'NO', to: 'd8' },
        ],
      },
      d8: {
        type: 'decision',
        text: '¿Ya intentó maniobras C, D y E?',
        branches: [
          { label: 'NO', to: 'n8' },
          { label: 'SI', to: 'end_corte' },
        ],
      },
      end_corte: { type: 'end', tone: 'escalate', text: 'Evaluar estrategia de corte de CT.' },
    },
  },

  {
    id: 'recuperacion-de-solidos',
    order: 3,
    title: 'Recuperación de sólidos',
    legend: [],
    notes: [
      'Limitar a 1.5 capacidad de pozo.',
      'TDS: tomar muestra cada 3 hs (delta no mayor a 30%).',
      'VMC con bola: 3 intentos máx. VMC hidráulica: aplicar procedimiento de la compañía. No superar las 2 horas.',
    ],
    start: 'start',
    nodes: {
      start: {
        type: 'start',
        text: 'Verificar parámetros de caudal y presión de lavado / retorno.',
        next: 'd0',
      },
      d0: {
        type: 'decision',
        text: '¿Los parámetros son correctos o incorrectos?',
        branches: [
          { label: 'Correctos', to: 'n1' },
          { label: 'Incorrectos', to: 'n2' },
        ],
      },
      n1: { type: 'process', text: 'Bombear bache de gel como trazador. Verificar en superficie. Analizar TDS (salinidad).', next: 'd2' },
      n2: { type: 'process', text: 'Corregir parámetros / verificar retornos.', next: 'd2' },
      d2: {
        type: 'decision',
        text: '¿Presencia de gas/HC?',
        branches: [
          { label: 'NO', to: 'd3' },
          { label: 'SI', to: 'n3' },
        ],
      },
      d3: {
        type: 'decision',
        text: '¿Retorna sólido / normaliza parámetros?',
        branches: [
          { label: 'SI', to: 'end1' },
          { label: 'NO', to: 'n4' },
        ],
      },
      end1: { type: 'end', tone: 'ok', text: 'Continuar lavando, verificando parámetros / retorno.' },
      n4: { type: 'process', text: 'Activar circulación de alto caudal (VMC).', next: 'd4' },
      d4: {
        type: 'decision',
        text: '¿Activación exitosa?',
        branches: [
          { label: 'NO', to: 'n4' },
          { label: 'SI', to: 'n5' },
        ],
      },
      n5: { type: 'process', text: 'Fondo arriba. (Enviar bache trazador.)', next: 'd5' },
      d5: {
        type: 'decision',
        text: '¿Sobretensión > 20% durante Pull-test?',
        branches: [
          { label: 'SI', to: 'n6' },
          { label: 'NO', to: 'n7' },
        ],
      },
      n6: { type: 'process', text: 'Detener maniobra.', next: 'end2' },
      end2: { type: 'end', tone: 'escalate', text: 'Consultar el programa "Cañería Aprisionada / Arrastre".' },
      n7: { type: 'process', text: 'Short Trip: alcanzar profundidad objetivo, realizar fondo arriba.', next: 'd6' },
      d6: {
        type: 'decision',
        text: '¿Retorna sólido / normaliza parámetros?',
        branches: [
          { label: 'SI', to: 'end_mdf' },
          { label: 'NO', to: 'n9' },
        ],
      },
      end_mdf: { type: 'end', tone: 'ok', text: 'Activar motor de fondo (MDF) y continuar lavando, verificando parámetros.' },
      n9: { type: 'process', text: 'Consensuar recuperar a KOP (máximo caudal).', next: 'n10' },
      n10: {
        type: 'process',
        text: 'Solicitar informe de análisis de fluido en retornos y sólidos recuperados (reología, TDS, historial de fluidos de retorno y bombeados).',
        next: 'n11',
      },
      n11: {
        type: 'process',
        text: 'Circular 1.5 fondos arriba, activar motor de fondo (MDF) y avanzar hasta la última profundidad alcanzada.',
        next: 'n12',
      },
      n12: { type: 'process', text: 'Bombear bache de gel como trazador. Verificar en superficie. Analizar TDS (salinidad).', next: 'd7' },
      d7: {
        type: 'decision',
        text: '¿Retorna bache / normaliza parámetros?',
        branches: [
          { label: 'SI', to: 'end_mdf' },
          { label: 'NO', to: 'd8' },
        ],
      },
      d8: {
        type: 'decision',
        text: '¿Se aumentó el sobrebalance?',
        branches: [
          { label: 'SI', to: 'end3' },
          { label: 'NO', to: 'n13' },
        ],
      },
      end3: {
        type: 'end',
        tone: 'escalate',
        text: 'Consensuar recuperar a superficie (máximo caudal). Garantizar caudal mínimo de retorno (Re > 20000). Evaluar realizar Bullheading en KOP.',
      },
      n13: {
        type: 'process',
        text: 'Analizar sobrebalance. Incrementar a 0,5 bpm. (Realizar loop garantizando caudal mínimo de retorno, Re > 20000.)',
        next: 'd7',
      },
      n3: {
        type: 'process',
        text: 'Circular 1 fondo arriba con bache de gel como trazador/limpieza a máximo caudal. Verificar en superficie. Revisar niveles de agua limpia.',
        next: 'd9',
      },
      d9: {
        type: 'decision',
        text: '¿Presencia de gas/HC?',
        branches: [
          { label: 'NO', to: 'start' },
          { label: 'SI', to: 'n14' },
        ],
      },
      n14: { type: 'process', text: 'Adicionar 0,3 bpm al sobrebalance. (Limitar a 1.5 capacidad de pozo.)', next: 'd10' },
      d10: {
        type: 'decision',
        text: '¿Sobrebalance mayor a 1,0 bpm?',
        branches: [
          { label: 'NO', to: 'n3' },
          { label: 'SI', to: 'end3' },
        ],
      },
    },
  },

  {
    id: 'perdida-de-avance',
    order: 4,
    title: 'Pérdida de avance',
    legend: [],
    notes: [
      'Velocidad para el pozo tipo correspondiente.',
      'VMC con bola: 3 intentos máx. VMC hidráulica: aplicar procedimiento de la compañía. No superar las 2 horas.',
    ],
    start: 'start',
    nodes: {
      start: { type: 'start', text: 'Verificar parámetros de caudal y presión de lavado / retorno.', next: 'd1' },
      d1: {
        type: 'decision',
        text: '¿Profundidad dentro de la 1ra etapa de pozo?',
        branches: [
          { label: 'SI', to: 'n1' },
          { label: 'NO', to: 'n2' },
        ],
      },
      n1: {
        type: 'end',
        tone: 'ok',
        text: 'Si la velocidad de lavado es menor a 20 m/h durante las últimas 3 hs, y luego de enviar bache de m-m: recuperar 30 m, activar VMC y sacar a superficie.',
      },
      n2: {
        type: 'decision',
        text: 'Analizar ROP (1 hs).',
        branches: [
          { label: 'Menor al mínimo (según rama)', to: 'n3' },
          { label: 'ROP=0 con stall de MDF (posible colapso)', to: 'n4' },
          { label: '¿ROP=0 con asentamiento? (sin stall de MDF)', to: 'n5' },
        ],
      },
      n3: { type: 'process', text: 'Bombear Reductor de Fricción Metal-Metal a demanda (10/20 lts cada 100 bbls).', next: 'd5' },
      n4: {
        type: 'process',
        text: 'Levantar 20 metros y profundizar (3 intentos máx. "efectivos" de 30 min c/u). Evaluar fatiga de tubería.',
        next: 'd2',
      },
      n5: { type: 'process', text: 'Bombear bache de limpieza (fondo arriba sin tensionar).', next: 'd2' },
      d2: {
        type: 'decision',
        text: '¿Pasa restricción / recupera avance?',
        branches: [
          { label: 'SI', to: 'n6' },
          { label: 'NO', to: 'd4' },
        ],
      },
      n6: { type: 'process', text: 'Repasar zona. Bombear bache de gel.', next: 'd4' },
      d4: {
        type: 'decision',
        text: '¿ROP supera el mínimo según rama?',
        branches: [
          { label: 'SI', to: 'd2' },
          { label: 'NO', to: 'end_star_right' },
        ],
      },
      end_star_right: { type: 'end', tone: 'escalate', text: 'Consensuar recuperar a superficie (máximo caudal).' },
      d5: {
        type: 'decision',
        text: '¿ROP supera el mínimo según rama?',
        branches: [
          { label: 'SI', to: 'end_lavando' },
          { label: 'NO', to: 'n_check' },
        ],
      },
      end_lavando: { type: 'end', tone: 'ok', text: 'Continuar lavando, verificando parámetros / retorno.' },
      n_check: {
        type: 'decision',
        text: 'Verificar integridad de tubería, prueba en negativo 5 minutos.',
        branches: [
          { label: 'NEGATIVA', to: 'end_star_left' },
          { label: 'OK', to: 'n_vmc' },
        ],
      },
      end_star_left: { type: 'end', tone: 'escalate', text: 'Consensuar recuperar a superficie (máximo caudal).' },
      n_vmc: { type: 'process', text: 'Activar VMC. Contemplar Short Trip.', next: 'd6' },
      d6: {
        type: 'decision',
        text: '¿Activación exitosa?',
        branches: [
          { label: 'NO', to: 'n_vmc' },
          { label: 'SI', to: 'd7' },
        ],
      },
      d7: {
        type: 'decision',
        text: '¿Sobretensión > 20% a la esperada?',
        branches: [
          { label: 'SI', to: 'n_detener' },
          { label: 'NO', to: 'n7' },
        ],
      },
      n_detener: { type: 'process', text: 'Detener maniobra.', next: 'end_cañeria' },
      end_cañeria: { type: 'end', tone: 'escalate', text: 'Consultar el programa "Cañería Aprisionada".' },
      n7: { type: 'process', text: 'Alcanzar profundidad objetivo de Short Trip / fondo arriba.', next: 'n8' },
      n8: { type: 'process', text: 'Activar motor de fondo (MDF) y profundizar.', next: 'd2' },
    },
  },
]

export function findContingencyCT(id) {
  return CONTINGENCIES_CT.find((c) => c.id === id)
}
