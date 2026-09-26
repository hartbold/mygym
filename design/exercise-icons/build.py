#!/usr/bin/env python3
"""
Genera la suite d'icones d'exercicis i grups musculars (SVG) i una pàgina de
previsualització. No s'usen a l'app: és material per validar.

Graella de 48×48, traç arrodonit amb `currentColor` (com `components/icons.tsx`).
Tres capes per icona:
  - aparell (bancs, màquines, politges): traç fi i atenuat;
  - pes (barres, manuelles, discos): traç fi i sòlid;
  - figura humana: traç gruixut i sòlid, cap ple.

    python3 design/exercise-icons/build.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

OUT = Path(__file__).parent
# Mòdul que fa servir l'app (components/ExerciseIcon.tsx).
APP_MODULE = OUT.parent.parent / "lib" / "exercise-icons.generated.ts"
SVG_OPEN = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" '
            'stroke-linecap="round" stroke-linejoin="round">')
FIG_W = 3.4
EQ_W = 2
WT_W = 2.2
HEAD_R = 3.2


def fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def pts(points) -> str:
    return " ".join(f"{fmt(x)},{fmt(y)}" for x, y in points)


class Icon:
    def __init__(self) -> None:
        self.eq: list[str] = []
        self.wt: list[str] = []
        self.fig: list[str] = []
        self.faint: list[str] = []

    # --- primitives -------------------------------------------------------
    @staticmethod
    def _line(points, extra="") -> str:
        if len(points) == 2:
            (x1, y1), (x2, y2) = points
            return f'<line x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}"{extra}/>'
        return f'<polyline points="{pts(points)}"{extra}/>'

    def line(self, *points, layer="eq", w=None):
        extra = f' stroke-width="{fmt(w)}"' if w else ""
        getattr(self, layer).append(self._line(points, extra))

    def circle(self, c, r, layer="eq", fill=False, w=None):
        extra = ' fill="currentColor" stroke="none"' if fill else ""
        if w:
            extra += f' stroke-width="{fmt(w)}"'
        getattr(self, layer).append(f'<circle cx="{fmt(c[0])}" cy="{fmt(c[1])}" r="{fmt(r)}"{extra}/>')

    def rect(self, x, y, w, h, rx=1.5, layer="eq"):
        getattr(self, layer).append(
            f'<rect x="{fmt(x)}" y="{fmt(y)}" width="{fmt(w)}" height="{fmt(h)}" rx="{fmt(rx)}"/>'
        )

    def path(self, d, layer="eq", w=None):
        extra = f' stroke-width="{fmt(w)}"' if w else ""
        getattr(self, layer).append(f'<path d="{d}"{extra}/>')

    # --- peces compostes --------------------------------------------------
    def head(self, c):
        self.circle(c, HEAD_R, layer="fig", fill=True)

    def limb(self, *points):
        self.line(*points, layer="fig")

    def far_limb(self, *points):
        """Braç o cama del costat allunyat (vista lateral): atenuat."""
        self.line(*points, layer="faint")

    def floor(self, y=42.5, x1=3, x2=45):
        self.line((x1, y), (x2, y))

    def plate(self, c, r=4.2):
        """Disc de barra vist de costat."""
        self.circle(c, r, layer="wt")
        self.circle(c, 0.9, layer="wt", fill=True)

    def dumbbell_side(self, c, r=2.4):
        self.circle(c, r, layer="wt")

    def dumbbell(self, c, vertical=True, half=3):
        """Manuella vista de front: nansa curta amb dos discos."""
        x, y = c
        if vertical:
            self.line((x, y - half), (x, y + half), layer="wt")
            self.line((x - 1.8, y - half), (x + 1.8, y - half), layer="wt", w=2.6)
            self.line((x - 1.8, y + half), (x + 1.8, y + half), layer="wt", w=2.6)
        else:
            self.line((x - half, y), (x + half, y), layer="wt")
            self.line((x - half, y - 1.8), (x - half, y + 1.8), layer="wt", w=2.6)
            self.line((x + half, y - 1.8), (x + half, y + 1.8), layer="wt", w=2.6)

    def barbell_front(self, y, x1, x2, plate_h=4):
        self.line((x1, y), (x2, y), layer="wt")
        for x in (x1 + 1.5, x2 - 1.5):
            self.line((x, y - plate_h), (x, y + plate_h), layer="wt", w=2.6)

    def stack(self, x, y, w, h):
        """Columna de plaques d'una màquina."""
        self.rect(x, y, w, h, rx=1.2)
        n = 5
        top = y + h * 0.45
        for i in range(n):
            yy = top + i * (h * 0.55) / n
            self.line((x + 1.2, yy), (x + w - 1.2, yy), w=1.2)

    def pad(self, *points, w=3.6):
        """Coixí (tram gruixut de l'aparell)."""
        self.line(*points, w=w)

    def arrow(self, a, b, layer="eq", head=2.2):
        self.line(a, b, layer=layer, w=1.6)
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        for s in (-1, 1):
            hx = b[0] - head * math.cos(ang + s * 0.6)
            hy = b[1] - head * math.sin(ang + s * 0.6)
            self.line((hx, hy), b, layer=layer, w=1.6)

    def svg(self) -> str:
        return SVG_OPEN + self.inner() + "</svg>"

    def inner(self) -> str:
        parts = []
        if self.eq:
            parts.append(f'<g opacity=".45" stroke-width="{EQ_W}">{"".join(self.eq)}</g>')
        if self.faint:
            parts.append(f'<g opacity=".4" stroke-width="{FIG_W}">{"".join(self.faint)}</g>')
        if self.wt:
            parts.append(f'<g stroke-width="{WT_W}">{"".join(self.wt)}</g>')
        if self.fig:
            parts.append(f'<g stroke-width="{FIG_W}">{"".join(self.fig)}</g>')
        return "".join(parts)


# --- figures reutilitzables --------------------------------------------------

def front_figure(i: Icon, cx=24, head_y=8, sh_y=14.5, hip_y=27, sh_half=5,
                 arms=None, legs=None, hip_half=3):
    """Figura de front. `arms`/`legs`: llistes de punts a partir de l'espatlla/maluc."""
    i.head((cx, head_y))
    i.limb((cx - sh_half, sh_y), (cx + sh_half, sh_y))
    i.limb((cx, sh_y), (cx, hip_y))
    i.limb((cx - hip_half, hip_y), (cx + hip_half, hip_y))
    for arm in arms or []:
        i.limb(*arm)
    for leg in legs or []:
        i.limb(*leg)


def lying_on_bench(i: Icon, bench_y=30):
    """Figura estirada panxa amunt en un banc pla (cap a l'esquerra)."""
    i.pad((6, bench_y), (32, bench_y))
    i.line((10, bench_y), (10, 42))
    i.line((29, bench_y), (29, 42))
    i.floor()
    i.head((8.5, bench_y - 4))
    i.limb((13, bench_y - 2.6), (26, bench_y - 2.6))
    i.limb((26, bench_y - 2.6), (33, bench_y - 5), (35.5, 41))
    return (13.5, bench_y - 2.6)


# --- icones d'exercicis ------------------------------------------------------
ICONS: dict[str, tuple[str, callable]] = {}


def icon(key: str, title: str):
    def deco(fn):
        ICONS[key] = (title, fn)
        return fn
    return deco


@icon("press-banca", "Banc pla amb barra")
def _(i: Icon):
    sh = lying_on_bench(i)
    i.line((16, 42), (16, 12))  # suport de la barra
    i.limb(sh, (13.5, 20), (13.5, 14))
    i.plate((13.5, 13))


@icon("press-inclinat", "Banc inclinat")
def _(i: Icon):
    i.pad((11, 18), (21, 32))
    i.pad((21, 32), (32, 32))
    i.line((24, 32), (24, 42))
    i.floor()
    i.head((12.5, 15.5))
    i.limb((16, 21), (23, 29.5))
    i.limb((23, 29.5), (32, 28), (35, 41))
    i.limb((16, 21), (18.5, 13.5), (19, 7.5))
    i.plate((19, 7))


@icon("press-declinat", "Banc declinat")
def _(i: Icon):
    i.pad((6, 33), (30, 24))
    i.line((10, 32), (10, 42))
    i.line((27, 26), (27, 42))
    i.circle((36, 30), 2.2)  # coixí per als peus
    i.line((30, 25), (36, 30))
    i.floor()
    i.head((7, 29))
    i.limb((12, 29), (27, 22))
    i.limb((27, 22), (33, 25), (36, 33))
    i.limb((12, 29), (12, 21), (12, 15))
    i.plate((12, 14))


@icon("press-pit-maquina", "Màquina de press de pit")
def _(i: Icon):
    i.stack(3, 8, 7, 34)
    i.pad((14, 12), (14, 31))
    i.pad((13, 31), (24, 31))
    i.line((18, 31), (18, 42))
    i.line((10, 7), (24, 7), (32, 13))
    i.pad((32, 14), (32, 22), w=3)
    i.floor()
    i.head((17, 9.5))
    i.limb((17, 15), (17.5, 28.5))
    i.limb((17.5, 28.5), (26, 29), (26, 41))
    i.limb((17, 16), (24, 19), (31, 18))


@icon("obertures-manuelles", "Obertures amb manuelles (vista de dalt)")
def _(i: Icon):
    i.rect(19, 5, 10, 30, rx=2)
    i.head((24, 8.5))
    i.limb((18.5, 14.5), (29.5, 14.5))
    i.limb((24, 14.5), (24, 28))
    i.limb((21.5, 28), (26.5, 28))
    i.limb((21.5, 28), (20, 42))
    i.limb((26.5, 28), (28, 42))
    i.limb((18.5, 14.5), (11, 18), (5.5, 15))
    i.limb((29.5, 14.5), (37, 18), (42.5, 15))
    i.dumbbell((4.5, 15))
    i.dumbbell((43.5, 15))
    i.path("M8 9.5 Q14 4 20 6", w=1.6)
    i.path("M40 9.5 Q34 4 28 6", w=1.6)


@icon("creuament-politges", "Creuament de politges")
def _(i: Icon):
    i.line((4, 4), (4, 42))
    i.line((44, 4), (44, 42))
    i.line((4, 4.5), (44, 4.5), w=1.2)
    i.circle((6.5, 7), 1.6)
    i.circle((41.5, 7), 1.6)
    i.line((6.5, 8.6), (21.5, 28), w=1.2)
    i.line((41.5, 8.6), (26.5, 28), w=1.2)
    i.floor()
    front_figure(i, head_y=10, sh_y=16, hip_y=29,
                 arms=[[(19, 16), (15.5, 22), (21.5, 28)], [(29, 16), (32.5, 22), (26.5, 28)]],
                 legs=[[(21, 29), (19.5, 41.5)], [(27, 29), (28.5, 41.5)]])


@icon("contractora", "Contractora (pec deck)")
def _(i: Icon):
    i.rect(15, 4, 18, 28, rx=2)
    i.pad((8.5, 5), (8.5, 19), w=4)
    i.pad((39.5, 5), (39.5, 19), w=4)
    i.line((8.5, 5), (15, 4))
    i.line((39.5, 5), (33, 4))
    i.pad((15, 32), (33, 32))
    i.line((24, 32), (24, 42))
    i.floor()
    front_figure(i, head_y=10, sh_y=16, hip_y=30,
                 arms=[[(19, 16), (11, 16), (11, 8)], [(29, 16), (37, 16), (37, 8)]],
                 legs=[[(21, 30), (18.5, 34), (18.5, 41.5)], [(27, 30), (29.5, 34), (29.5, 41.5)]])


@icon("paralleles", "Paral·leles")
def _(i: Icon):
    for x in (13, 35):
        i.line((x, 25), (x, 42))
        i.pad((x - 3.5, 25), (x + 3.5, 25))
    i.floor()
    front_figure(i, head_y=8, sh_y=14, hip_y=27,
                 arms=[[(19, 14), (15, 19.5), (13, 24.5)], [(29, 14), (33, 19.5), (35, 24.5)]],
                 legs=[[(21, 27), (21, 33), (24.5, 38)], [(27, 27), (27, 33), (23.5, 38)]])


@icon("flexions", "Flexions")
def _(i: Icon):
    i.floor()
    i.head((7.5, 25))
    i.limb((12, 28), (28, 33), (42, 40.5))
    i.limb((12, 28), (12, 40.5))


@icon("dominades", "Barra de dominades")
def _(i: Icon):
    i.line((5, 5), (43, 5), w=2.4)
    i.line((6, 5), (6, 2), w=1.4)
    i.line((42, 5), (42, 2), w=1.4)
    front_figure(i, head_y=11, sh_y=17, hip_y=30,
                 arms=[[(19, 17), (12.5, 13), (15, 5)], [(29, 17), (35.5, 13), (33, 5)]],
                 legs=[[(21, 30), (20.5, 38), (22.5, 44)], [(27, 30), (27.5, 38), (25.5, 44)]])


@icon("dominades-assistides", "Dominades assistides (màquina)")
def _(i: Icon):
    i.line((5, 5), (43, 5), w=2.4)
    i.line((6, 5), (6, 42))
    i.line((42, 5), (42, 42))
    i.pad((14, 37), (34, 37), w=3.6)
    i.line((24, 37), (24, 42))
    i.floor()
    i.arrow((39, 40), (39, 32))
    front_figure(i, head_y=11, sh_y=17, hip_y=29,
                 arms=[[(19, 17), (12.5, 13), (15, 5)], [(29, 17), (35.5, 13), (33, 5)]],
                 legs=[[(21, 29), (20.5, 35)], [(27, 29), (27.5, 35)]])


@icon("politja-alta", "Politja alta (jaló al pit)")
def _(i: Icon):
    i.line((24, 2), (24, 9), w=1.2)
    i.circle((24, 2.5), 1.4)
    i.line((5, 12), (8, 9), (40, 9), (43, 12), layer="wt")
    i.pad((15, 29), (21, 29), w=3)
    i.pad((27, 29), (33, 29), w=3)
    i.pad((16, 34), (32, 34))
    i.line((24, 34), (24, 42))
    i.floor()
    front_figure(i, head_y=14.5, sh_y=20, hip_y=32,
                 arms=[[(19, 20), (12, 17), (9, 9)], [(29, 20), (36, 17), (39, 9)]],
                 legs=[[(21, 32), (18.5, 35), (18.5, 41.5)], [(27, 32), (29.5, 35), (29.5, 41.5)]])


@icon("rem-barra", "Rem amb barra")
def _(i: Icon):
    i.floor()
    i.head((36, 16.5))
    i.limb((31.5, 19), (15, 24))
    i.limb((15, 24), (21, 32), (18, 41.5))
    i.far_limb((15, 24), (22, 33), (22, 41.5))
    i.limb((30, 19.5), (29.5, 26), (28, 31))
    i.plate((28, 32))


@icon("rem-manuella", "Rem amb manuella")
def _(i: Icon):
    i.pad((4, 29), (27, 29))
    i.line((7, 29), (7, 42))
    i.line((24, 29), (24, 42))
    i.floor()
    i.head((31, 18))
    i.limb((26.5, 20.5), (12, 22))
    i.limb((12, 22), (10, 27), (3.5, 27))
    i.limb((12, 22), (15, 32), (16, 41.5))
    i.limb((25.5, 20.5), (25.5, 27))
    i.limb((23.5, 21), (18.5, 15), (20.5, 22))
    i.dumbbell_side((20.5, 23))


@icon("politja-baixa", "Rem a la politja baixa")
def _(i: Icon):
    i.pad((4, 35), (38, 35))
    i.line((8, 35), (8, 42))
    i.line((34, 35), (34, 42))
    i.pad((39, 26), (39, 35), w=3)
    i.circle((43, 38), 1.6)
    i.line((43, 36.4), (43, 4))
    i.line((19, 25.5), (41.5, 37.2), w=1.2)
    i.floor()
    i.head((13, 12))
    i.limb((13, 17.5), (13, 32))
    i.limb((13, 32), (26, 28), (37, 30.5))
    i.limb((13, 18.5), (8.5, 24.5), (18.5, 25.5))


@icon("rem-maquina", "Rem a la màquina")
def _(i: Icon):
    i.stack(40, 8, 6, 34)
    i.pad((28, 14), (28, 27), w=4)
    i.line((28, 27), (28, 42))
    i.pad((12, 33), (24, 33))
    i.line((18, 33), (18, 42))
    i.line((35, 16), (35, 7), (40, 7))
    i.pad((35, 16), (35, 23), w=3)
    i.floor()
    i.head((23.5, 11))
    i.limb((22.5, 16.5), (18.5, 31))
    i.limb((18.5, 31), (26, 31.5), (26, 41.5))
    i.limb((22, 18), (29, 22), (35, 19.5))


@icon("pullover", "Pullover")
def _(i: Icon):
    sh = lying_on_bench(i)
    i.limb(sh, (8, 22), (3.5, 17.5))
    i.dumbbell_side((3.5, 16.5), r=2.6)
    i.path("M6 11 Q12 5 17 12", w=1.6)
    i.arrow((16, 10.5), (17, 12.5))


@icon("obertures-posteriors", "Obertures posteriors (ocell)")
def _(i: Icon):
    i.floor()
    i.head((24, 19))
    i.limb((18.5, 23), (29.5, 23))
    i.limb((24, 23), (24, 27))
    i.limb((21, 27.5), (27, 27.5))
    i.limb((21, 27.5), (19, 34), (19.5, 41.5))
    i.limb((27, 27.5), (29, 34), (28.5, 41.5))
    i.limb((18.5, 23), (11, 20), (5, 22))
    i.limb((29.5, 23), (37, 20), (43, 22))
    i.dumbbell((4, 22))
    i.dumbbell((44, 22))
    i.arrow((10, 29), (6, 26))
    i.arrow((38, 29), (42, 26))


@icon("pes-mort", "Pes mort")
def _(i: Icon):
    i.floor()
    i.head((32, 14))
    i.limb((28, 17.5), (14, 26))
    i.limb((14, 26), (24, 32), (21, 41.5))
    i.limb((27, 18.5), (25.5, 33.5))
    i.plate((25.5, 37.5), r=5)


@icon("hiperextensions", "Banc d'hiperextensions")
def _(i: Icon):
    i.line((8, 42), (30, 26))
    i.line((20, 34), (20, 42))
    i.pad((25, 30.5), (32, 23), w=4)
    i.circle((11.5, 36), 2)
    i.floor()
    i.limb((12, 38.5), (29, 23.5))
    i.limb((29, 23.5), (38, 13.5))
    i.head((41, 9))
    i.limb((37, 15), (33.5, 18), (38.5, 19))


@icon("esquat", "Esquat amb barra")
def _(i: Icon):
    i.floor()
    i.plate((19.5, 15.5), r=5)
    i.head((25, 11))
    i.limb((21.5, 16.5), (13, 28))
    i.limb((13, 28), (26, 30), (22, 41.5))
    i.limb((21.5, 17.5), (17, 21), (19.5, 16))


@icon("esquat-frontal", "Esquat frontal")
def _(i: Icon):
    i.floor()
    i.head((22, 9))
    i.limb((21, 14.5), (15, 28))
    i.limb((15, 28), (27, 30), (23, 41.5))
    i.limb((21, 15.5), (29, 19), (26.5, 15))
    i.plate((27.5, 15.5), r=5)


@icon("multipower", "Multipower (màquina Smith)")
def _(i: Icon):
    i.line((6, 3), (6, 42))
    i.line((32, 3), (32, 42))
    i.line((6, 3), (32, 3))
    i.line((19.5, 3), (19.5, 42), w=1.2)
    i.floor()
    i.plate((19.5, 15.5), r=5)
    i.head((25, 11))
    i.limb((21.5, 16.5), (13, 28))
    i.limb((13, 28), (26, 30), (22, 41.5))
    i.limb((21.5, 17.5), (17, 21), (19.5, 16))


@icon("esquat-bulgar", "Esquat búlgar")
def _(i: Icon):
    i.pad((2, 29), (13, 29))
    i.line((5, 29), (5, 42))
    i.line((11, 29), (11, 42))
    i.floor()
    i.head((21, 7.5))
    i.limb((20.5, 13), (19.5, 26))
    i.limb((19.5, 26), (29, 31), (28, 41.5))
    i.limb((19.5, 26), (16.5, 36), (9, 28))
    i.limb((20.5, 14), (22, 26))
    i.dumbbell_side((22.5, 28.5))


@icon("premsa", "Premsa de cames")
def _(i: Icon):
    i.line((17, 42), (44, 10))
    i.pad((3, 22), (11, 35), w=4)
    i.pad((11, 36), (19, 37), w=4)
    i.line((14, 37), (14, 42))
    i.floor()
    i.pad((26, 14), (34, 25), w=3)
    i.circle((38, 16), 3.2, layer="wt")
    i.head((5, 18))
    i.limb((8, 23.5), (14.5, 33.5))
    i.limb((14.5, 33.5), (18, 21), (29, 20.5))
    i.limb((9, 25), (13, 31.5))


@icon("gambades", "Gambades")
def _(i: Icon):
    i.floor()
    i.head((22, 7))
    i.limb((22, 12.5), (21, 26))
    i.limb((21, 26), (32, 31), (32, 41.5))
    i.limb((21, 26), (15, 36.5), (7, 41.5))
    i.limb((22, 13.5), (23.5, 25))
    i.dumbbell_side((24, 27.5))


@icon("extensio-quadriceps", "Extensió de quàdriceps")
def _(i: Icon):
    i.stack(2, 8, 6, 34)
    i.pad((13, 11), (13, 30))
    i.pad((12, 30.5), (26, 30.5))
    i.line((18, 30.5), (18, 42))
    i.line((26, 31), (34, 26), w=1.8)
    i.circle((35.5, 25.5), 2.3)
    i.floor()
    i.head((17, 8))
    i.limb((16.5, 13.5), (17, 27.5))
    i.limb((17, 27.5), (26, 28), (35.5, 22))
    i.limb((16.5, 14.5), (21, 21), (22, 27.5))


@icon("curl-femoral", "Curl femoral")
def _(i: Icon):
    i.pad((4, 30), (33, 30))
    i.line((8, 30), (8, 42))
    i.line((30, 30), (30, 42))
    i.stack(40, 12, 6, 30)
    i.circle((36, 19), 2.3)
    i.line((33, 29), (36, 21.3), w=1.8)
    i.floor()
    i.head((6, 23.5))
    i.limb((10.5, 27.3), (23, 27.3))
    i.limb((23, 27.3), (31.5, 27.3), (34.5, 18))
    i.limb((10.5, 27.3), (6.5, 33), (5, 30))


@icon("hip-thrust", "Hip thrust")
def _(i: Icon):
    i.pad((2, 25), (11, 25))
    i.line((6, 25), (6, 42))
    i.floor()
    i.plate((22, 17.5), r=4.5)
    i.head((5.5, 18.5))
    i.limb((9.5, 22.5), (22, 22.5))
    i.limb((22, 22.5), (32, 23), (32, 41.5))
    i.limb((10, 22.5), (16, 19), (21, 18))


def _hip_machine(i: Icon, outward: bool):
    i.rect(16, 5, 16, 24, rx=2)
    i.pad((14, 33), (34, 33))
    i.line((24, 33), (24, 42))
    i.floor()
    front_figure(i, head_y=10, sh_y=16, hip_y=30,
                 arms=[[(19, 16), (15.5, 23), (16, 30)], [(29, 16), (32.5, 23), (32, 30)]],
                 legs=[[(21, 30), (12, 33), (12, 41.5)], [(27, 30), (36, 33), (36, 41.5)]])
    if outward:
        i.pad((8, 29), (8, 37), w=4)
        i.pad((40, 29), (40, 37), w=4)
        i.arrow((5, 24), (1.5, 24))
        i.arrow((43, 24), (46.5, 24))
    else:
        i.pad((16, 34.5), (16, 40), w=4)
        i.pad((32, 34.5), (32, 40), w=4)
        i.arrow((5, 24), (9.5, 24))
        i.arrow((43, 24), (38.5, 24))


@icon("abductors", "Màquina d'abductors")
def _(i: Icon):
    _hip_machine(i, outward=True)


@icon("adductors", "Màquina d'adductors")
def _(i: Icon):
    _hip_machine(i, outward=False)


@icon("bessons", "Elevació de bessons (màquina)")
def _(i: Icon):
    i.stack(38, 4, 7, 38)
    i.line((30, 9), (38, 9))
    i.pad((17, 10), (30, 10), w=4)
    i.rect(17, 38.5, 13, 4, rx=1)
    i.floor()
    i.head((23.5, 5))
    i.limb((23, 11), (23, 26))
    i.limb((23, 26), (23, 35), (25.5, 38.5))
    i.limb((23, 12), (27, 17), (27.5, 11))
    i.arrow((13, 40), (13, 33))


@icon("press-espatlles", "Press d'espatlles")
def _(i: Icon):
    i.rect(17, 12, 14, 20, rx=2)
    i.pad((15, 33), (33, 33))
    i.line((24, 33), (24, 42))
    i.floor()
    front_figure(i, head_y=12, sh_y=18, hip_y=31,
                 arms=[[(19, 18), (11, 17), (12, 8)], [(29, 18), (37, 17), (36, 8)]],
                 legs=[[(21, 31), (18.5, 35), (18.5, 41.5)], [(27, 31), (29.5, 35), (29.5, 41.5)]])
    i.dumbbell((12, 7), vertical=False)
    i.dumbbell((36, 7), vertical=False)


@icon("elevacions-laterals", "Elevacions laterals")
def _(i: Icon):
    i.floor()
    front_figure(i, head_y=7, sh_y=13.5, hip_y=26,
                 arms=[[(19, 13.5), (12, 15), (5.5, 16.5)], [(29, 13.5), (36, 15), (42.5, 16.5)]],
                 legs=[[(21, 26), (20, 41.5)], [(27, 26), (28, 41.5)]])
    i.dumbbell((4, 16.5))
    i.dumbbell((44, 16.5))
    i.path("M7 27 Q4 23 5 20", w=1.6)
    i.path("M41 27 Q44 23 43 20", w=1.6)


@icon("elevacions-frontals", "Elevacions frontals")
def _(i: Icon):
    i.floor()
    i.head((20, 7))
    i.limb((20, 12.5), (20, 26))
    i.limb((20, 26), (19.5, 41.5))
    i.far_limb((20, 26), (22.5, 41.5))
    i.far_limb((20, 13.5), (21, 26))
    i.limb((20, 13.5), (28, 13.5), (35, 13.5))
    i.dumbbell_side((37, 13.5))
    i.path("M36 21 Q37 26 29 27", w=1.6)


@icon("rem-mento", "Rem al mentó")
def _(i: Icon):
    i.floor()
    front_figure(i, head_y=7, sh_y=13.5, hip_y=26,
                 arms=[[(19, 13.5), (12, 11), (21, 16)], [(29, 13.5), (36, 11), (27, 16)]],
                 legs=[[(21, 26), (20, 41.5)], [(27, 26), (28, 41.5)]])
    i.barbell_front(17, 13, 35)
    i.arrow((41, 28), (41, 20))


@icon("encongiments", "Encongiments d'espatlles")
def _(i: Icon):
    i.floor()
    front_figure(i, head_y=8, sh_y=12.5, hip_y=26, sh_half=6,
                 arms=[[(18, 12.5), (16.5, 20), (16, 27)], [(30, 12.5), (31.5, 20), (32, 27)]],
                 legs=[[(21, 26), (20, 41.5)], [(27, 26), (28, 41.5)]])
    i.dumbbell((16, 30))
    i.dumbbell((32, 30))
    i.arrow((10, 15), (10, 9))
    i.arrow((38, 15), (38, 9))


@icon("curl-barra", "Curl de bíceps amb barra")
def _(i: Icon):
    i.floor()
    i.head((20, 7))
    i.limb((20, 12.5), (20, 26))
    i.limb((20, 26), (19.5, 41.5))
    i.far_limb((20, 26), (22.5, 41.5))
    i.limb((20, 13.5), (20.5, 23), (28, 17.5))
    i.plate((29.5, 16.5))
    i.path("M32 28 Q36 24 35 20", w=1.6)


@icon("curl-manuelles", "Curl amb manuelles")
def _(i: Icon):
    i.floor()
    front_figure(i, head_y=7, sh_y=13.5, hip_y=26,
                 arms=[[(19, 13.5), (18.5, 21.5), (15.5, 15)], [(29, 13.5), (30.5, 20), (31, 26.5)]],
                 legs=[[(21, 26), (20, 41.5)], [(27, 26), (28, 41.5)]])
    i.dumbbell((14.5, 13.5), vertical=False)
    i.dumbbell((31, 29.5), vertical=False)


@icon("banc-scott", "Banc Scott")
def _(i: Icon):
    i.pad((21, 18), (31, 30), w=4)
    i.line((27, 26), (27, 42))
    i.pad((8, 33), (20, 33))
    i.line((14, 33), (14, 42))
    i.floor()
    i.head((16, 8))
    i.limb((16, 13.5), (14.5, 30))
    i.limb((14.5, 30), (22, 32), (22, 41.5))
    i.limb((17, 15), (28.5, 25), (35, 17.5))
    i.plate((36, 16), r=3.8)


@icon("press-frances", "Press francès")
def _(i: Icon):
    sh = lying_on_bench(i)
    i.limb(sh, (13.5, 17), (7.5, 20))
    i.plate((6.5, 20.5), r=3.6)
    i.path("M10 13 Q16 9 18 15", w=1.6)


@icon("triceps-politja", "Tríceps a la politja")
def _(i: Icon):
    i.line((40, 3), (40, 42))
    i.line((40, 4), (32, 4))
    i.circle((32, 5.5), 1.5)
    i.line((32, 7), (32, 27), w=1.2)
    i.line((29, 27.5), (35, 27.5), layer="wt")
    i.floor()
    i.head((23, 7))
    i.limb((22.5, 12.5), (21.5, 26))
    i.limb((21.5, 26), (21, 41.5))
    i.far_limb((21.5, 26), (24, 41.5))
    i.limb((22.5, 13.5), (22, 21.5), (31, 27.5))
    i.arrow((36, 18), (36, 25))


@icon("fons-banc", "Fons de tríceps al banc")
def _(i: Icon):
    i.pad((2, 28), (13, 28))
    i.line((4, 28), (4, 42))
    i.line((11, 28), (11, 42))
    i.floor()
    i.head((17, 11))
    i.limb((16.5, 16.5), (18, 31))
    i.limb((18, 31), (29, 32), (40, 40))
    i.limb((16, 17.5), (10.5, 21.5), (12, 27))


@icon("patada-triceps", "Patada de tríceps")
def _(i: Icon):
    i.pad((30, 29), (44, 29))
    i.line((33, 29), (33, 42))
    i.line((42, 29), (42, 42))
    i.floor()
    i.head((31, 16.5))
    i.limb((26.5, 19.5), (12, 22))
    i.limb((12, 22), (16, 31), (13, 41.5))
    i.far_limb((12, 22), (9, 31), (9, 41.5))
    i.limb((26.5, 20), (32, 28.5))
    i.limb((24.5, 20.5), (17, 18), (8, 18))
    i.dumbbell_side((6, 18))


@icon("crunch", "Crunch abdominal")
def _(i: Icon):
    i.floor()
    i.head((12, 28))
    i.limb((15.5, 32), (24, 39.5))
    i.limb((24, 39.5), (31, 30), (38, 40.5))
    i.limb((16, 32), (12, 34.5), (10, 30.5))
    i.path("M9 20 Q12 17 16 19", w=1.6)
    i.arrow((14.5, 18), (16.5, 19.5))


@icon("elevacio-cames", "Elevació de cames penjat")
def _(i: Icon):
    i.line((6, 4), (42, 4), w=2.4)
    i.head((27, 13))
    i.limb((23.5, 4.5), (23.5, 17))
    i.limb((23.5, 17), (23.5, 30))
    i.limb((23.5, 30), (32, 30), (41, 29))
    i.arrow((38, 42), (38, 34))


@icon("roda", "Roda abdominal")
def _(i: Icon):
    i.floor()
    i.circle((38, 38.5), 3.8, layer="wt")
    i.circle((38, 38.5), 0.9, layer="wt", fill=True)
    i.head((34, 26))
    i.limb((30, 29.5), (18, 33))
    i.limb((18, 33), (11, 40.5), (3.5, 40.5))
    i.limb((30, 30), (37.5, 37))


@icon("planxa", "Planxa")
def _(i: Icon):
    i.floor()
    i.head((8, 29))
    i.limb((12, 32), (27, 35), (43, 40.5))
    i.limb((12, 32), (12, 40.5), (19, 40.5))


@icon("planxa-lateral", "Planxa lateral")
def _(i: Icon):
    i.floor()
    i.head((8, 21))
    i.limb((11, 26), (27, 33), (43, 40.5))
    i.limb((11, 26), (11, 40.5), (17, 40.5))
    i.limb((11, 26), (11, 11))


@icon("gir-rus", "Gir rus")
def _(i: Icon):
    i.floor()
    i.head((12, 18))
    i.limb((15, 22.5), (22, 38))
    i.limb((22, 38), (30, 28), (39, 33))
    i.limb((15.5, 23.5), (22, 26), (29, 25))
    i.dumbbell_side((30.5, 24.5), r=2.6)
    i.path("M25 15 Q31 12 35 17", w=1.6)
    i.arrow((33.5, 15), (35, 17.5))


# --- cardio ------------------------------------------------------------------

@icon("cinta", "Cinta de córrer")
def _(i: Icon):
    i.rect(4, 37.5, 36, 4.5, rx=2.25)
    i.line((38, 37.5), (33, 13))
    i.line((29, 12), (37, 14), w=2.6)
    i.line((33, 20), (26, 20))
    i.head((21, 7))
    i.limb((20.5, 12.5), (18.5, 24))
    i.limb((18.5, 24), (25, 29), (27.5, 36))
    i.limb((18.5, 24), (14, 30), (8.5, 32))
    i.limb((20, 13.5), (25, 18.5), (27, 14.5))
    i.far_limb((20, 13.5), (15, 19), (11, 17))


@icon("bicicleta", "Bicicleta estàtica")
def _(i: Icon):
    i.circle((33, 34), 6)
    i.line((10, 42), (40, 42))
    i.line((16, 42), (22, 23))
    i.line((33, 34), (32, 16))
    i.line((14, 21.5), (22, 21.5), w=2.8)
    i.line((30, 15), (35, 15), w=2.6)
    i.circle((24, 33), 1.4)
    i.head((29, 5.5))
    i.limb((26.5, 10.5), (18, 19.5))
    i.limb((18, 19.5), (27, 23), (27.5, 32))
    i.far_limb((18, 19.5), (22, 28), (20.5, 36))
    i.limb((26.5, 11.5), (31, 15))


@icon("el-liptica", "El·líptica")
def _(i: Icon):
    i.line((4, 42), (44, 42))
    i.circle((39, 34), 5)
    i.line((12, 38), (34, 30))
    i.line((33, 32), (29, 12), w=2.2)
    i.line((36, 34), (35, 12), w=2.2)
    i.head((22, 5.5))
    i.limb((21.5, 11), (21, 24))
    i.limb((21, 24), (27, 29), (28, 32))
    i.limb((21, 24), (18, 31), (15, 36.5))
    i.limb((22, 12), (25, 18), (29.5, 13))


@icon("rem-ergometre", "Màquina de rem")
def _(i: Icon):
    i.line((3, 37), (44, 37))
    i.line((6, 37), (6, 42))
    i.line((40, 37), (40, 42))
    i.circle((40, 29), 5.5)
    i.pad((10, 34), (18, 34), w=3.2)
    i.line((32, 36), (34, 28), w=2.6)
    i.line((18.5, 24.5), (40, 29), w=1.2)
    i.head((8.5, 13))
    i.limb((10.5, 18.5), (14, 32))
    i.limb((14, 32), (25, 28), (33, 33))
    i.limb((11, 19.5), (9, 26), (18.5, 24.5))


@icon("escaladora", "Escaladora")
def _(i: Icon):
    i.line((6, 42), (6, 36), (14, 36), (14, 30), (22, 30), (22, 24), (30, 24), (30, 18), (38, 18), (38, 42))
    i.line((6, 24), (38, 6))
    i.head((17, 4))
    i.limb((17, 9.5), (16.5, 21))
    i.limb((16.5, 21), (23, 23.5), (24, 29.5))
    i.limb((16.5, 21), (13.5, 28), (11, 35.5))
    i.limb((17, 10.5), (21.5, 14.5), (23, 13))


@icon("corda", "Saltar a corda")
def _(i: Icon):
    i.floor(y=44)
    front_figure(i, head_y=8, sh_y=14.5, hip_y=27,
                 arms=[[(19, 14.5), (15, 21), (11, 25)], [(29, 14.5), (33, 21), (37, 25)]],
                 legs=[[(21, 27), (21.5, 34), (20.5, 39.5)], [(27, 27), (26.5, 34), (27.5, 39.5)]])
    i.path("M11 25 C8 33 14 44 24 43 C34 44 40 33 37 25", layer="wt")


@icon("burpees", "Burpees")
def _(i: Icon):
    i.floor(y=44)
    front_figure(i, head_y=10, sh_y=16.5, hip_y=28,
                 arms=[[(19, 16.5), (16, 9.5), (14, 3)], [(29, 16.5), (32, 9.5), (34, 3)]],
                 legs=[[(21, 28), (19, 34), (21, 39.5)], [(27, 28), (29, 34), (27, 39.5)]])
    i.line((12, 41.5), (16, 41.5), w=1.6)
    i.line((32, 41.5), (36, 41.5), w=1.6)
    i.arrow((41, 28), (41, 19))


@icon("granger", "Passeig del granger")
def _(i: Icon):
    i.floor()
    i.head((23, 6.5))
    i.limb((22.5, 12), (22, 25))
    i.limb((22, 25), (28, 33), (31, 41.5))
    i.limb((22, 25), (18, 33), (13, 41.5))
    i.limb((22.5, 13), (23, 25.5))
    i.far_limb((22.5, 13), (20.5, 25.5))
    i.dumbbell((23, 29.5), vertical=False, half=3.5)
    i.arrow((33, 12), (41, 12))


# --- exercicis creats per l'usuari -------------------------------------------

@icon("personalitzat", "Exercici creat per l'usuari")
def _(i: Icon):
    """Figura neutra, sense aparell, amb un llapis: «l'has creat tu»."""
    i.floor(x1=6, x2=34)
    front_figure(i, cx=20, head_y=10, sh_y=16.5, hip_y=28.5,
                 arms=[[(15, 16.5), (13, 23), (13.5, 29)], [(25, 16.5), (27, 23), (26.5, 29)]],
                 legs=[[(17, 28.5), (16.5, 41.5)], [(23, 28.5), (23.5, 41.5)]])
    # Llapis inclinat a la cantonada
    i.line((31.5, 15.5), (41.5, 5.5), (44.5, 8.5), (34.5, 18.5), (31, 19), (31.5, 15.5), layer="wt", w=1.8)
    i.line((39.5, 7.5), (42.5, 10.5), layer="wt", w=1.8)


# --- grups musculars ---------------------------------------------------------
BODY_OP = ".22"


def body(back=False) -> str:
    """Silueta de front (o d'esquena) atenuada, amb traços gruixuts."""
    s = [f'<g opacity="{BODY_OP}">',
         '<circle cx="24" cy="6.5" r="4" fill="currentColor" stroke="none"/>',
         '<path d="M15 13.5 Q24 11 33 13.5 L31.5 29 Q24 31 16.5 29 Z" fill="currentColor" stroke="none"/>',
         '<g stroke-width="4.6">',
         '<polyline points="15.5,14.5 12,24 10.5,32"/>',
         '<polyline points="32.5,14.5 36,24 37.5,32"/>',
         '<polyline points="20,29 19,38 19,45.5"/>',
         '<polyline points="28,29 29,38 29,45.5"/>',
         '</g></g>']
    return "".join(s)


def muscle_svg(inner: str, back=False) -> str:
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" '
            'stroke-linecap="round" stroke-linejoin="round">' + body(back) + inner + "</svg>")


MUSCLES = {
    "pit": ("Pit", muscle_svg(
        '<path d="M16.5 15 Q20 13.5 23.3 14.5 L23.3 20.5 Q19 22.5 16.2 19.5 Z" fill="currentColor" stroke="none"/>'
        '<path d="M31.5 15 Q28 13.5 24.7 14.5 L24.7 20.5 Q29 22.5 31.8 19.5 Z" fill="currentColor" stroke="none"/>')),
    "esquena": ("Esquena", muscle_svg(
        '<path d="M16.5 14.5 L23.3 17 L23.3 27 Q20 27 18.5 25 Z" fill="currentColor" stroke="none"/>'
        '<path d="M31.5 14.5 L24.7 17 L24.7 27 Q28 27 29.5 25 Z" fill="currentColor" stroke="none"/>'
        '<path d="M20 12.3 Q24 11 28 12.3 L24 16.5 Z" fill="currentColor" stroke="none"/>', back=True)),
    "cames": ("Cames", muscle_svg(
        '<g stroke-width="4.6"><polyline points="20,30 19,38 19,45.5"/><polyline points="28,30 29,38 29,45.5"/></g>')),
    "espatlles": ("Espatlles", muscle_svg(
        '<circle cx="15" cy="15.5" r="3.3" fill="currentColor" stroke="none"/>'
        '<circle cx="33" cy="15.5" r="3.3" fill="currentColor" stroke="none"/>')),
    "bracos": ("Braços", muscle_svg(
        '<g stroke-width="4.6"><polyline points="14,18.5 12,24 10.5,32"/><polyline points="34,18.5 36,24 37.5,32"/></g>')),
    "core": ("Abdominals", muscle_svg(
        "".join(f'<rect x="{x}" y="{y}" width="3.6" height="2.7" rx=".9" fill="currentColor" stroke="none"/>'
                for y in (19.5, 22.9, 26.3) for x in (20.2, 24.2)))),
    "cardio": ("Cardio", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" '
               'stroke-linecap="round" stroke-linejoin="round">'
               '<path d="M24 40 C10 30 5 23 5 16 C5 10.5 9.5 7 14.5 7 C18.5 7 21.5 9.5 24 13 C26.5 9.5 29.5 7 33.5 7 '
               'C38.5 7 43 10.5 43 16 C43 23 38 30 24 40 Z" stroke-width="3.2"/>'
               '<polyline points="9,23 17,23 20,17 24.5,29 28,21 30,23 39,23" stroke-width="2.4"/></svg>'),
}

# --- exercici del catàleg → icona -------------------------------------------
EXERCISES = {
    "Press de banca": "press-banca",
    "Press inclinat": "press-inclinat",
    "Press declinat": "press-declinat",
    "Press de pit a la màquina": "press-pit-maquina",
    "Obertures amb manuelles": "obertures-manuelles",
    "Creuament de politges": "creuament-politges",
    "Contractora de pit": "contractora",
    "Fons a les paral·leles": "paralleles",
    "Flexions": "flexions",
    "Dominades": "dominades",
    "Dominades assistides": "dominades-assistides",
    "Estirada al pit": "politja-alta",
    "Rem amb barra": "rem-barra",
    "Rem amb manuella": "rem-manuella",
    "Rem a la politja baixa": "politja-baixa",
    "Rem a la màquina": "rem-maquina",
    "Pullover": "pullover",
    "Obertures posteriors": "obertures-posteriors",
    "Pes mort": "pes-mort",
    "Hiperextensions": "hiperextensions",
    "Esquat": "esquat",
    "Esquat frontal": "esquat-frontal",
    "Esquat al multipower": "multipower",
    "Esquat búlgar": "esquat-bulgar",
    "Premsa de cames": "premsa",
    "Gambades": "gambades",
    "Extensió de quàdriceps": "extensio-quadriceps",
    "Curl femoral": "curl-femoral",
    "Hip thrust": "hip-thrust",
    "Màquina d'abductors": "abductors",
    "Màquina d'adductors": "adductors",
    "Elevació de bessons": "bessons",
    "Bessons a la premsa": "premsa",
    "Press d'espatlles": "press-espatlles",
    "Press Arnold": "press-espatlles",
    "Elevacions laterals": "elevacions-laterals",
    "Elevacions frontals": "elevacions-frontals",
    "Rem al mentó": "rem-mento",
    "Encongiments d'espatlles": "encongiments",
    "Curl de bíceps amb barra": "curl-barra",
    "Curl de bíceps amb manuelles": "curl-manuelles",
    "Curl martell": "curl-manuelles",
    "Curl Scott": "banc-scott",
    "Curl concentrat": "curl-manuelles",
    "Press francès": "press-frances",
    "Tríceps a la politja": "triceps-politja",
    "Fons de tríceps al banc": "fons-banc",
    "Patada de tríceps": "patada-triceps",
    "Crunch abdominal": "crunch",
    "Crunch invers": "crunch",
    "Elevació de cames penjat": "elevacio-cames",
    "Roda abdominal": "roda",
    "Planxa": "planxa",
    "Planxa lateral": "planxa-lateral",
    "Gir rus": "gir-rus",
    "Cinta de córrer": "cinta",
    "Bicicleta estàtica": "bicicleta",
    "El·líptica": "el-liptica",
    "Màquina de rem": "rem-ergometre",
    "Escaladora": "escaladora",
    "Saltar a corda": "corda",
    "Burpees": "burpees",
    "Passeig del granger": "granger",
}


PREVIEW_CSS = """
:root { --bg:#f2f2f7; --card:#fff; --label:#000; --label2:#3c3c4399; --fill:#7878801f; --sep:#3c3c434a; }
@media (prefers-color-scheme: dark) { :root:not([data-theme=light]) { --bg:#000; --card:#1c1c1e; --label:#fff; --label2:#ebebf599; --fill:#7676803d; --sep:#54545899; } }
:root[data-theme=dark] { --bg:#000; --card:#1c1c1e; --label:#fff; --label2:#ebebf599; --fill:#7676803d; --sep:#54545899; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--label); font:15px/1.35 -apple-system, system-ui, sans-serif; padding:24px 16px 48px; }
h1 { font-size:28px; margin:0 0 4px; } h2 { font-size:13px; text-transform:uppercase; letter-spacing:.02em; color:var(--label2); margin:32px 4px 8px; font-weight:500; }
p.lead { color:var(--label2); margin:0 0 8px; max-width:60ch; }
.toolbar { display:flex; gap:8px; margin:12px 0; }
.toolbar button { font:inherit; border:0; border-radius:99px; padding:6px 14px; background:var(--fill); color:var(--label); }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:10px; }
.card { background:var(--card); border-radius:16px; padding:12px; display:flex; flex-direction:column; gap:8px; }
.card .big { width:96px; height:96px; align-self:center; }
.card .row { display:flex; align-items:center; gap:8px; }
.tile { width:40px; height:40px; border-radius:10px; background:var(--fill); display:grid; place-items:center; flex:none; }
.tile svg { width:32px; height:32px; }
.card .name { font-weight:600; font-size:14px; }
.card .ex { color:var(--label2); font-size:12px; }
.card .key { color:var(--label2); font:11px ui-monospace, monospace; }
.list { background:var(--card); border-radius:16px; max-width:420px; overflow:hidden; }
.item { display:flex; gap:12px; align-items:center; padding:8px 16px; }
.item + .item .txt { border-top:.5px solid var(--sep); }
.item .txt { flex:1; padding:6px 0; }
.item .sub { color:var(--label2); font-size:13px; }
svg { display:block; }
"""


def main() -> None:
    svg_dir = OUT / "svg"
    musc_dir = OUT / "muscles"
    svg_dir.mkdir(exist_ok=True)
    musc_dir.mkdir(exist_ok=True)

    rendered: dict[str, str] = {}
    inners: dict[str, str] = {}
    for key, (title, fn) in ICONS.items():
        i = Icon()
        fn(i)
        rendered[key] = i.svg()
        inners[key] = i.inner()
        (svg_dir / f"{key}.svg").write_text(rendered[key] + "\n", encoding="utf-8")
    for key, (_, svg) in MUSCLES.items():
        (musc_dir / f"{key}.svg").write_text(svg + "\n", encoding="utf-8")

    missing = set(EXERCISES.values()) - set(ICONS)
    assert not missing, missing
    module = [
        "// Generat per design/exercise-icons/build.py — no l'editeu a mà.",
        "",
        "/** Contingut de cada icona (graella 48×48, traç amb `currentColor`). */",
        "export const EXERCISE_ICON_SVGS = {",
        *(f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}," for k, v in inners.items()),
        "} as const;",
        "",
        "export type ExerciseIconKey = keyof typeof EXERCISE_ICON_SVGS;",
        "",
        "/** Icona dels exercicis creats per l'usuari (no són al catàleg). */",
        'export const CUSTOM_EXERCISE_ICON: ExerciseIconKey = "personalitzat";',
        "",
        "/** Nom de l'exercici del catàleg → icona. */",
        "export const EXERCISE_ICON_BY_NAME: Record<string, ExerciseIconKey> = {",
        *(f"  {json.dumps(n, ensure_ascii=False)}: {json.dumps(k)}," for n, k in EXERCISES.items()),
        "};",
        "",
    ]
    APP_MODULE.write_text("\n".join(module), encoding="utf-8")
    (OUT / "mapping.json").write_text(json.dumps(EXERCISES, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    by_icon: dict[str, list[str]] = {}
    for ex, key in EXERCISES.items():
        by_icon.setdefault(key, []).append(ex)

    cards = []
    for key, (title, _) in ICONS.items():
        cards.append(
            f'<div class="card"><div class="big">{rendered[key]}</div>'
            f'<div class="row"><div class="tile">{rendered[key]}</div>'
            f'<div><div class="name">{title}</div><div class="key">{key}.svg</div></div></div>'
            f'<div class="ex">{" · ".join(by_icon.get(key, []))}</div></div>'
        )
    mcards = [
        f'<div class="card"><div class="big">{svg}</div><div class="row"><div class="tile">{svg}</div>'
        f'<div><div class="name">{label}</div><div class="key">muscles/{key}.svg</div></div></div></div>'
        for key, (label, svg) in MUSCLES.items()
    ]
    sample = ["Estirada al pit", "Rem a la politja baixa", "Premsa de cames", "Contractora de pit", "Curl femoral", "Cinta de córrer"]
    items = "".join(
        f'<div class="item"><div class="tile">{rendered[EXERCISES[n]]}</div><div class="txt">{n}'
        f'<div class="sub">icona: {EXERCISES[n]}</div></div></div>'
        for n in sample
    )
    html = f"""<!doctype html>
<html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Icones d'exercicis</title><style>{PREVIEW_CSS}</style></head>
<body>
<h1>Icones d'exercicis</h1>
<p class="lead">{len(ICONS)} icones per als {len(EXERCISES)} exercicis del catàleg, i {len(MUSCLES)} de grups musculars. Proposta per validar: encara no es fan servir a l'app.</p>
<div class="toolbar"><button onclick="document.documentElement.dataset.theme='light'">Clar</button><button onclick="document.documentElement.dataset.theme='dark'">Fosc</button></div>
<h2>Com es veurien al cercador</h2>
<div class="list">{items}</div>
<h2>Exercicis i màquines</h2>
<div class="grid">{''.join(cards)}</div>
<h2>Grups musculars</h2>
<div class="grid">{''.join(mcards)}</div>
</body></html>
"""
    (OUT / "preview.html").write_text(html, encoding="utf-8")
    print(f"{len(ICONS)} icones, {len(MUSCLES)} grups musculars, {len(EXERCISES)} exercicis")


if __name__ == "__main__":
    main()
