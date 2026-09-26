# MY GYM · Format dels fitxers d'importació

L'app importa dos tipus de fitxer JSON des d'**Ajustos**:

1. **Plantilles d'entrenament** (botó «Importa plantilles»). És el format pensat per
   preparar rutines a mà, amb un entrenador o amb una IA.
2. **Còpia de seguretat** (botó «Importa una còpia»). És el fitxer que genera
   «Exporta una còpia»: tot l'historial, el pes corporal, el perfil i les plantilles.

Els dos fitxers són JSON en UTF-8. Les dades es desen només al dispositiu: importar
mai envia res enlloc.

---

## 1. Plantilles d'entrenament

### Estructura

```json
{
  "app": "mygym",
  "type": "templates",
  "formatVersion": 1,
  "templates": [
    {
      "name": "Cames",
      "notes": "Descans de 2 minuts entre sèries",
      "exercises": [
        { "name": "Esquat", "kind": "reps", "sets": [{ "weight": 70, "reps": 6 }, { "weight": 70, "reps": 6 }] },
        { "name": "Curl femoral", "sets": [{ "weight": 30, "reps": 12 }] },
        { "name": "Planxa", "kind": "time", "sets": [{ "durationSec": 60 }] }
      ]
    }
  ]
}
```

També s'accepta directament la llista de plantilles, sense l'embolcall:

```json
[{ "name": "Cames", "exercises": [{ "name": "Esquat", "sets": [{ "weight": 70, "reps": 6 }] }] }]
```

### Camps

**Embolcall** (només si no és una llista directa)

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `app` | `"mygym"` | sí | Identifica el fitxer. |
| `type` | `"templates"` | sí | Distingeix el fitxer de plantilles de la còpia de seguretat. |
| `formatVersion` | `1` | no | Versió del format. L'exportació sempre l'hi posa. |
| `templates` | llista | sí | Com a mínim una plantilla. |

**Plantilla**

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `name` | text | sí | Nom de la rutina. Si ja n'hi ha una amb el mateix nom, s'hi afegeix « (importada)». |
| `notes` | text | no | Notes lliures. |
| `exercises` | llista | sí | Exercicis en l'ordre en què es faran. Pot ser buida. |

**Exercici**

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `name` | text | sí | Nom de l'exercici. Feu servir un nom del [catàleg](#catàleg-dexercicis) perquè quedi lligat a l'historial, als músculs i al progrés. Un nom que no hi és es crea com a exercici propi. |
| `kind` | `"reps"` o `"time"` | no | `reps`: sèries de repeticions (amb pes o sense). `time`: sèries de durada. Si falta, es pren del catàleg; si l'exercici no hi és, és `time` quan les sèries només porten `durationSec`, i `reps` en qualsevol altre cas. |
| `sets` | llista | no | Sèries planificades. Si falta, l'exercici queda sense sèries. |

**Sèrie planificada** (tots els camps són opcionals; un camp buit es deixa per omplir al gimnàs)

| Camp | Tipus | Descripció |
| --- | --- | --- |
| `weight` | número ≥ 0 | Pes en kg. Admet decimals (`62.5`). |
| `reps` | enter ≥ 0 | Repeticions. |
| `durationSec` | número ≥ 0 | Durada en segons (exercicis `time`). |

### Com s'importa

- Cada plantilla importada és **nova**: mai substitueix ni esborra les que ja tens.
- Els noms antics del catàleg (p. ex. «Pressió sobre banc» o «Press banca») es
  converteixen automàticament al nom actual («Press de banca»).
- Si el fitxer té algun error, no s'importa res i l'app diu quina plantilla o
  exercici falla.

---

## 2. Còpia de seguretat

És el fitxer `mygym-backup-AAAA-MM-DD.json` que genera «Exporta una còpia». Normalment
no cal escriure'l a mà. Aquesta secció serveix per entendre'l o generar-lo des d'una
altra app.

### Estructura

```json
{
  "app": "mygym",
  "formatVersion": 2,
  "exportedAt": "2026-09-26T14:30:00.000Z",
  "data": {
    "entries": [
      {
        "id": "e1",
        "name": "Press de banca",
        "kind": "reps",
        "date": "2026-09-25",
        "startedAt": 1790340000000,
        "endedAt": 1790341200000,
        "status": "done",
        "updatedAt": 1790341200000,
        "sets": [
          { "id": "s1", "weight": 60, "reps": 8, "doneAt": 1790340300000 },
          { "id": "s2", "weight": 62.5, "reps": 6, "doneAt": 1790340600000 }
        ]
      }
    ],
    "bodyWeights": [{ "id": "w1", "date": "2026-09-25", "kg": 78.5, "updatedAt": 1790330000000 }],
    "profile": { "id": "me", "heightCm": 178, "updatedAt": 1790330000000 },
    "templates": []
  }
}
```

Totes les dates i hores (`startedAt`, `endedAt`, `doneAt`, `updatedAt`, `createdAt`)
són **mil·lisegons des de l'1 de gener de 1970 (UTC)**, com `Date.now()` de JavaScript.
Els camps `date` són el dia local en format `AAAA-MM-DD`.

### Camps

**Embolcall**

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `app` | `"mygym"` | sí | Identifica el fitxer. |
| `formatVersion` | `1` o `2` | sí | La versió 1 només té `entries`. La 2 hi afegeix pes, perfil i plantilles. |
| `exportedAt` | text | sí | Data de l'exportació (ISO 8601). Només informativa. |
| `data.entries` | llista | sí | Exercicis fets (pot ser buida). |
| `data.bodyWeights` | llista | no | Registres de pes corporal. |
| `data.profile` | objecte | no | Perfil (alçada). |
| `data.templates` | llista | no | Plantilles d'entrenament. |

**Entrada** (`data.entries[]`): un exercici fet en una sessió.

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `id` | text no buit | sí | Identificador únic. Serveix per fusionar amb el que ja hi ha. |
| `name` | text no buit | sí | Nom de l'exercici (vegeu el [catàleg](#catàleg-dexercicis)). |
| `kind` | `"reps"` o `"time"` | sí | Tipus d'exercici. |
| `date` | `AAAA-MM-DD` | sí | Dia de l'entrenament (hora local). |
| `startedAt` | mil·lisegons ≥ 0 | sí | Quan es va començar. |
| `status` | `"active"` o `"done"` | sí | `active` només si encara estava en marxa. |
| `endedAt` | mil·lisegons | si `status` és `done` | Quan es va acabar; no pot ser anterior a `startedAt`. No es posa si `status` és `active`. |
| `updatedAt` | mil·lisegons ≥ 0 | sí | Última modificació. Decideix quina versió guanya en fusionar. |
| `sets` | llista | sí | Sèries fetes (pot ser buida). |
| `autoClosed` | `true` | no | L'app la va tancar per inactivitat. S'ignora en importar. |

**Sèrie feta** (`sets[]` d'una entrada)

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `id` | text no buit | sí | Identificador de la sèrie. |
| `doneAt` | mil·lisegons ≥ 0 | sí | Quan es va fer. |
| `weight` | número ≥ 0 | no | Pes en kg. |
| `reps` | número ≥ 0 | no | Repeticions. |
| `durationSec` | número ≥ 0 | no | Durada en segons. |

**Pes corporal** (`data.bodyWeights[]`)

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `id` | text no buit | sí | Identificador. |
| `date` | `AAAA-MM-DD` | sí | Dia del registre (un per dia). |
| `kg` | número > 0 | sí | Pes en kg. |
| `updatedAt` | mil·lisegons ≥ 0 | sí | Última modificació. |

**Perfil** (`data.profile`)

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `id` | `"me"` | sí | Sempre `"me"`. |
| `heightCm` | número > 0 | no | Alçada en cm. |
| `updatedAt` | mil·lisegons ≥ 0 | sí | Última modificació. |

**Plantilla** (`data.templates[]`)

| Camp | Tipus | Obligatori | Descripció |
| --- | --- | --- | --- |
| `id` | text no buit | sí | Identificador. |
| `name` | text | sí | Nom de la rutina. |
| `notes` | text | no | Notes lliures. |
| `createdAt` | mil·lisegons ≥ 0 | sí | Creació. |
| `updatedAt` | mil·lisegons ≥ 0 | sí | Última modificació. |
| `exercises[].id` | text | sí | Identificador de l'exercici dins la plantilla. |
| `exercises[].name` | text | sí | Nom de l'exercici. |
| `exercises[].kind` | `"reps"` o `"time"` | sí | Tipus d'exercici. |
| `exercises[].sets` | llista | sí | Sèries planificades (`weight`, `reps`, `durationSec`, tots opcionals). |

### Com s'importa

- **Sempre fusiona, mai esborra.** Un `id` nou s'afegeix. Si l'`id` ja existeix,
  guanya la versió amb l'`updatedAt` més gran.
- El pes corporal es fusiona **per dia** (`date`), no per `id`.
- Tota entrada importada queda com a feta (`done`). Si venia `active`, `endedAt`
  passa a ser l'última activitat coneguda.
- Els noms antics del catàleg es converteixen al nom actual.
- Si qualsevol element no és vàlid, no s'importa res: les dades queden tal com
  estaven.

---

## Catàleg d'exercicis

Noms que l'app reconeix. Escriviu-los exactament així, amb accents, a `name`. El
castellà i l'anglès són només de referència: a l'app es poden cercar, però al fitxer
cal el nom català.

**Pit**

| Nom (`name`) | `kind` | Castellà | Anglès |
| --- | --- | --- | --- |
| Press de banca | `reps` | Press de banca | Bench press |
| Press inclinat | `reps` | Press inclinado | Incline bench press |
| Press declinat | `reps` | Press declinado | Decline bench press |
| Press de pit a la màquina | `reps` | Press de pecho en máquina | Chest press machine |
| Obertures amb manuelles | `reps` | Aperturas con mancuernas | Dumbbell fly |
| Creuament de politges | `reps` | Cruce de poleas | Cable crossover |
| Contractora de pit | `reps` | Contractora (mariposa) | Pec deck |
| Fons a les paral·leles | `reps` | Fondos en paralelas | Dips |
| Flexions | `reps` | Flexiones | Push-ups |

**Esquena**

| Nom (`name`) | `kind` | Castellà | Anglès |
| --- | --- | --- | --- |
| Dominades | `reps` | Dominadas | Pull-ups |
| Dominades assistides | `reps` | Dominadas asistidas | Assisted pull-up machine |
| Estirada al pit | `reps` | Jalón al pecho | Lat pulldown |
| Rem amb barra | `reps` | Remo con barra | Barbell row |
| Rem amb manuella | `reps` | Remo con mancuerna | Dumbbell row |
| Rem a la politja baixa | `reps` | Remo en polea baja | Seated cable row |
| Rem a la màquina | `reps` | Remo en máquina | Machine row |
| Pullover | `reps` | Pullover | Pullover |
| Obertures posteriors | `reps` | Pájaros | Reverse fly |
| Hiperextensions | `reps` | Hiperextensiones | Back extension |

**Cames**

| Nom (`name`) | `kind` | Castellà | Anglès |
| --- | --- | --- | --- |
| Pes mort | `reps` | Peso muerto | Deadlift |
| Esquat | `reps` | Sentadilla | Squat |
| Esquat frontal | `reps` | Sentadilla frontal | Front squat |
| Esquat al multipower | `reps` | Sentadilla en multipower | Smith machine squat |
| Esquat búlgar | `reps` | Sentadilla búlgara | Bulgarian split squat |
| Premsa de cames | `reps` | Prensa de piernas | Leg press |
| Gambades | `reps` | Zancadas | Lunges |
| Extensió de quàdriceps | `reps` | Extensión de cuádriceps | Leg extension |
| Curl femoral | `reps` | Curl femoral | Leg curl |
| Hip thrust | `reps` | Hip thrust | Hip thrust |
| Màquina d'abductors | `reps` | Máquina de abductores | Hip abduction machine |
| Màquina d'adductors | `reps` | Máquina de aductores | Hip adduction machine |
| Elevació de bessons | `reps` | Elevación de gemelos | Standing calf raise |
| Bessons a la premsa | `reps` | Gemelos en prensa | Calf press |

**Espatlles**

| Nom (`name`) | `kind` | Castellà | Anglès |
| --- | --- | --- | --- |
| Press d'espatlles | `reps` | Press militar | Shoulder press |
| Press Arnold | `reps` | Press Arnold | Arnold press |
| Elevacions laterals | `reps` | Elevaciones laterales | Lateral raise |
| Elevacions frontals | `reps` | Elevaciones frontales | Front raise |
| Rem al mentó | `reps` | Remo al mentón | Upright row |
| Encongiments d'espatlles | `reps` | Encogimientos de hombros | Shrugs |

**Braços**

| Nom (`name`) | `kind` | Castellà | Anglès |
| --- | --- | --- | --- |
| Curl de bíceps amb barra | `reps` | Curl de bíceps con barra | Barbell curl |
| Curl de bíceps amb manuelles | `reps` | Curl con mancuernas | Dumbbell curl |
| Curl martell | `reps` | Curl martillo | Hammer curl |
| Curl Scott | `reps` | Curl en banco Scott | Preacher curl |
| Curl concentrat | `reps` | Curl concentrado | Concentration curl |
| Press francès | `reps` | Press francés | Skull crusher |
| Tríceps a la politja | `reps` | Extensión de tríceps en polea | Triceps pushdown |
| Fons de tríceps al banc | `reps` | Fondos de tríceps en banco | Bench dips |
| Patada de tríceps | `reps` | Patada de tríceps | Triceps kickback |

**Abdominals**

| Nom (`name`) | `kind` | Castellà | Anglès |
| --- | --- | --- | --- |
| Crunch abdominal | `reps` | Crunch abdominal | Crunch |
| Crunch invers | `reps` | Crunch inverso | Reverse crunch |
| Elevació de cames penjat | `reps` | Elevación de piernas colgado | Hanging leg raise |
| Roda abdominal | `reps` | Rueda abdominal | Ab wheel rollout |
| Planxa | `time` | Plancha | Plank |
| Planxa lateral | `time` | Plancha lateral | Side plank |
| Gir rus | `reps` | Giro ruso | Russian twist |

**Cardio**

| Nom (`name`) | `kind` | Castellà | Anglès |
| --- | --- | --- | --- |
| Cinta de córrer | `time` | Cinta de correr | Treadmill |
| Bicicleta estàtica | `time` | Bicicleta estática | Stationary bike |
| El·líptica | `time` | Elíptica | Elliptical |
| Màquina de rem | `time` | Remo (máquina) | Rowing machine |
| Escaladora | `time` | Escaladora | Stair climber |
| Saltar a corda | `time` | Saltar a la comba | Jump rope |
| Burpees | `reps` | Burpees | Burpees |
| Passeig del granger | `time` | Paseo del granjero | Farmer's walk |
