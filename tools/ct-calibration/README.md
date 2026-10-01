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
     --ertMode mu --stall 1 --fix speedSurfRef=20 --iters 600 \
     --params muRIH,muPOOH,speedCoefRIH,speedCoefPOOH,residualContact,ertMuReductionRef,ertZoneM,speedSurfRIH,speedSurfPOOH \
     [--test PAD] [--tag nombre] [--global 1]
   ```

   `--stall 1` agrega como restricción que BdC-1030h carrera 1 (ERT
   fallado) no se trabó hasta 5632 m (estuvo fresando con 25–30 klb de
   slack-off). `--global 1` usa un único
   stripper / reel para todas las carreras (como la app con sus valores por
   defecto) en lugar de resolverlos por carrera.

   Los datos de 1 s del pad B1B se procesan con `build_bins_1s.py` (la
   velocidad sale de la diferencia de profundidad porque en BdC-1030h r1 el
   canal de velocidad está escalado ×0,1; carreras con `survey` y `ert`
   propios). `build_bins_4min.py` sirve para exportaciones de baja
   frecuencia.

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
- ERT: BdC-1030h carrera 1 (ERT fallado) fresó hasta 5632 m sin trabarse
  y se sacó; la carrera 2 (ERT funcionando) llegó a TD (6745 m). En marcha
  libre la carrera 2 lee ~3,5 klb menos en RIH **y** en POOH que la 1: es un
  offset de superficie, no menor arrastre, así que el peso libre no muestra
  un efecto medible del ERT. El ajuste da −22 % de µ en los últimos ~3750 m
  (1500 lbf/bpm a 4,2 bpm), pero varía 8–22 % entre los pliegues de la
  validación cruzada: es el parámetro menos determinado. Sin ERT el modelo
  traba BdC-1030h a ~5880 m.
- Asentamiento: en 121 de 136 bandas de fresado el slack-off observado
  entra en la capacidad del modelo; las 15 restantes están cerca de TD
  (6550–6750 m), donde el modelo es algo conservador.
- Validación cruzada por pad (física de dos pads, offsets por carrera):
  error mediano 1,0–5,1 klb.
- El offset de superficie (stripper + reel) varía entre pozos del mismo pad
  (hasta ~12 klb): conviene ajustarlo con la primera lectura real
  ("Ajustar a la carrera" en la app).
- La sarta estándar va con el extremo de 0,175" abajo (orden core → libre);
  la orientación inversa ajusta 2–3 veces peor.
- La ondulación de ±5 klb en el POOH del pad B3A2 (unidad PCN2) no aparece
  en C1A (PCN1) y no la explica ninguna variable registrada (en estudio).
