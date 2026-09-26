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
   node tools/ct-calibration/fit_profile.mjs --ert 1500 \
     --params muRIH,muPOOH,speedCoefRIH,speedCoefPOOH,speedSurfRIH,speedSurfPOOH \
     [--train B3A2 --test C1A] [--tag nombre]
   ```

   Nelder-Mead sobre los parámetros físicos; para cada candidato la fricción
   del stripper y la tensión del reel de **cada pozo** se resuelven en forma
   cerrada (mediana de residuos RIH/POOH), porque el operador las fija en
   cada trabajo y no se pueden predecir desde la física. Con `--train/--test`
   se valida en un pad que el ajuste no vio.

   `calibrate.mjs` es el ajuste conjunto original (más lento), útil como
   diagnóstico (`--variant offsets` estima un offset por pozo).

5. Copiar los parámetros a `src/ctsim/calibration.js`.

## Hallazgos (pads B3A2 y C1A, 6 pozos)

- El modelo soft-string de CTES (Orpheus) reproduce la forma de las curvas.
- µ RIH > µ POOH, como documenta CTES (curvatura residual del CT en RIH).
- La fricción aumenta con la velocidad (ley logarítmica, tipo rate-and-state):
  en el lateral, RIH más rápido pesa menos y POOH más rápido pesa más.
- Hay un término de superficie que depende de la velocidad y no de la
  fricción en el pozo (reel / stripper / inyector).
- El offset de superficie (stripper + reel) varía entre pozos del mismo pad
  (hasta ~12 klb): conviene ajustarlo con la primera lectura real
  ("Ajustar a la carrera" en la app).
- La sarta estándar va con el extremo de 0,175" abajo (orden core → libre);
  la orientación inversa ajusta 2–3 veces peor.
- La ondulación de ±5 klb en el POOH del pad B3A2 (unidad PCN2) no aparece
  en C1A (PCN1) y no la explica ninguna variable registrada (en estudio).
