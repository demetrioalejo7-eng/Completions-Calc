# Calibración del simulador de pesos CT

Herramientas para ajustar los términos empíricos de `src/ctsim/forces.js`
con carreras reales. Los datos de campo (surveys y CSV del sistema de
adquisición) van en `field-data/`, que está en `.gitignore`: **nunca se
suben al repositorio**. Solo se versionan los coeficientes resultantes en
`src/ctsim/calibration.js`.

## Flujo

1. **Cargar las carreras** (Python, requiere `pandas`, `pyarrow`):

   ```bash
   python3 tools/ct-calibration/load_run.py "<export>.csv" field-data/<pad>.parquet
   ```

   Imprime los períodos en superficie / en pozo para identificar cada carrera.

2. **Armar el dataset** — editar el diccionario `RUNS` de `build_bins.py`
   (pozo → parquet, inicio, fin, pad) y correr:

   ```bash
   python3 tools/ct-calibration/build_bins.py   # → field-data/bins.csv
   ```

   Toma solo movimiento estable (|v| > 1,5 m/min, velocidad estable 1 min),
   mediana móvil de 15 s del peso y medianas por bin de 25 m, separadas por
   dirección y por pasada.

3. **Surveys** — `field-data/surveys.json` con `{ "<pozo>": [[MD, Inc, Az], ...] }`
   (m, °). El parser de la app (`src/ctsim/parsers.js`) lee los xlsx.

4. **Ajuste** (Node):

   ```bash
   node tools/ct-calibration/fit_profile.mjs --train B3A2,C1A,B1B --ert 1500 \
     --ertMode mu --stall 1 --fix speedSurfRef=20 --iters 700 \
     --params muRIH,muPOOH,speedCoefRIH,speedCoefPOOH,residualContact,ertMuReductionRef,ertZoneM,speedSurfRIH,speedSurfPOOH \
     [--test PAD] [--tag nombre] [--global 1]
   ```

   `--stall 1` agrega como restricción que BdC-1030h carrera 1 (ERT
   trabado) llegue al lock-up entre 5632 y 5800 m. `--rbtMin N` impone una
   tensión de reel mínima en cada carrera. `--global 1` usa un único
   stripper / reel para todas las carreras (como la app con sus valores por
   defecto) en lugar de resolverlos por carrera.

   Los datos de 1 s del pad B1B se procesan con `build_bins_1s.py` (la
   velocidad sale de la diferencia de profundidad porque en BdC-1030h r1 el
   canal de velocidad está escalado ×0,1; carreras con `survey` y `ert`
   propios). `build_bins_4min.py` sirve para exportaciones de baja
   frecuencia.

   Las exportaciones de 1 dato por minuto (pad C1B) van con
   `build_bins_1min.py` (peso = valor Last del minuto; velocidad entre las
   muestras vecinas). Cada carrera lleva su survey, el estado y el tamaño
   del ERT (`ertK`, lbf/bpm) y, si es anómala, una etiqueta de pad aparte
   (`C1B-X`) para quedar fuera del entrenamiento. `lib.mjs` usa la sarta
   SPI 41571 en los pads de SPI (`STRING_BY_PAD`).

   `build_slack.py` extrae los eventos de asentamiento (fresado / tag en el
   lateral): slack-off = peso libre RIH − peso en el indicador, donde los
   offsets de superficie se cancelan. Sirve para contrastar la capacidad de
   set-down del modelo.

   Nelder-Mead sobre los parámetros físicos; para cada candidato la fricción
   del stripper y la tensión del reel de **cada pozo** se resuelven en forma
   cerrada (mediana de residuos RIH/POOH), porque el operador las fija en
   cada trabajo y no se pueden predecir desde la física. Con `--train/--test`
   se valida en un pad que el ajuste no vio.

   `calibrate.mjs` es el ajuste conjunto original (más lento), útil como
   diagnóstico (`--variant offsets` estima un offset por pozo).

5. Copiar los parámetros a `src/ctsim/calibration.js`.

## Pad C1B (jul-2026, SPI, ERT media intensidad, 4 carreras + 1 anómala)

- Prueba ciega con la calibración de 3 pads: RIH dentro de ±3 klb, pero el
  modelo daba lock-up a 6560–6810 m y los 4 pozos llegaron a TD (6910–7019
  m). Con el C1B en el entrenamiento: 0 puntos en lock-up, el ERT queda en
  ~50 % de reducción de µ en los últimos ~3200 m (a 1500 lbf/bpm × 4,2 bpm;
  ~32 % con media intensidad a 4 bpm), µ RIH 0,278 / µ POOH 0,286 con
  contacto residual 0,09 lbf/ft. Los otros pads quedan igual (error mediano
  1,3–2,4 klb).
- Validación cruzada dejando afuera cada pad: error mediano en el pad no
  visto 1,3–2,6 klb; sin el C1B el modelo sigue trabando el C1B: el alcance
  con ERT media necesitó sus propios datos.
- BdC-1037h r1 (aprisionamiento con sobretensión) queda fuera: entre 5290 y
  5355 m la mediana RIH cae de +9 a −9 klb con la velocidad bajando de 3 a
  0,9 m/min; luego tensiones de 59–76 klb (POOH normal ~45–49 klb).

## Hallazgos (pads B3A2, C1A y B1B, 11 carreras)

- El modelo soft-string de CTES (Orpheus) reproduce la forma de las curvas.
- µ RIH > µ POOH, como documenta CTES (curvatura residual del CT en RIH).
- La fricción aumenta con la velocidad (ley logarítmica, tipo rate-and-state):
  en el lateral, RIH más rápido pesa menos y POOH más rápido pesa más.
- Hay un término de superficie que depende de la velocidad y no de la
  fricción en el pozo (reel / stripper / inyector), ≈ 370 lb por m/min.
  Se referencia a 20 m/min: referenciado a 0 m/min hacía que la rama
  vertical en RIH (20–27 m/min) diera 8–11 klb más pesada que la real con
  los valores por defecto de stripper / reel.
- Las pendientes de peso en la vertical (10–13 lb/m) coinciden con el
  modelo; el contacto extra por curvatura residual ajusta chico (0,09 lbf/ft).
- ERT: BdC-1030h carrera 1 (ERT trabado) fresó hasta 5632 m y se sacó por
  caída de velocidad con asentamiento creciente (lock-up incipiente); la
  carrera 2 (ERT funcionando) llegó a TD (6745 m). En marcha libre la
  carrera 2 lee ~3,5 klb menos en RIH **y** en POOH que la 1: es un offset de
  superficie, no menor arrastre. El ajuste (lock-up sin ERT entre 5632 y
  5800 m) da −48 % de µ en los últimos ~2350 m (1500 lbf/bpm a 4,2 bpm);
  entre pliegues de la validación cruzada, 20–34 % en 2700–3750 m.
- POOH sin ERT: la sacada final se hace bombeando por la válvula multiciclo
  con el ERT baypaseado (`lib.mjs` marca `finalPooh` a los puntos POOH
  posteriores a la máxima profundidad; los viajes intermedios conservan el
  ERT). Con eso el ajuste libre da µ RIH 0,295 > µ POOH 0,270, como indica
  CTES por la curvatura residual, y todos los pliegues mantienen µ RIH >
  µ POOH. Suponer el ERT activo en POOH había invertido las dos fricciones.
  La pendiente fuerte del POOH en el lateral (~12 lb/m) la explican la
  tensión en la curva y los doglegs del lateral, y el modelo la reproduce.
- Reel: cerca de superficie (60–400 m, fricción despreciable) las lecturas
  dan stripper ≈ 4,7–11 klb y un término de reel ≈ 0, aunque la tensión real
  del reel es ≥ 4000 lbf: el indicador se tara con el CT en el inyector y el
  reel tensionado. Forzar RBT ≥ 4000 lbf en la lectura empeora el ajuste un
  50 % y baja artificialmente el µ RIH a 0,15 (`--rbtMin 4000`).
- Asentamiento: en 121 de 136 bandas de fresado el slack-off observado
  entra en la capacidad del modelo; las 15 restantes están cerca de TD
  (6550–6750 m), donde el modelo es algo conservador.
- Validación cruzada por pad (física de dos pads, offsets por carrera):
  error mediano 1,0–5,1 klb; µ RIH 0,26–0,29 > µ POOH 0,23–0,28 según el pad.
- El offset de superficie (stripper + reel) varía entre pozos del mismo pad
  (hasta ~12 klb): conviene ajustarlo con la primera lectura real
  ("Ajustar a la carrera" en la app).
- La sarta estándar va con el extremo de 0,175" abajo (orden core → libre);
  la orientación inversa ajusta 2–3 veces peor.
- La ondulación de ±5 klb en el POOH del pad B3A2 (unidad PCN2) no aparece
  en C1A (PCN1) y no la explica ninguna variable registrada (en estudio).
