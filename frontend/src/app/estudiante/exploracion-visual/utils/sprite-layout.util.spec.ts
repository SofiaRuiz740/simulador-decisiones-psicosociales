import {
  ajustarPosicionAlLimites,
  estimarBoundingBoxSprite,
  resolverPosicionSprite,
  validarSpriteVisible,
} from './sprite-layout.util';

describe('sprite-layout.util', () => {
  const posicion = (x: number, y: number) => ({ x, y, ancho: 10, alto: 8 });

  it('ancla los pies dentro del escenario en sala de espera', () => {
    const resuelta = resolverPosicionSprite(posicion(24, 86), 'sala-espera');
    const bbox = estimarBoundingBoxSprite(resuelta.x, resuelta.piesY, false, resuelta.factorEscala);

    expect(bbox.abajo).toBeLessThanOrEqual(92);
    expect(bbox.arriba).toBeGreaterThanOrEqual(12);
    expect(bbox.izquierda).toBeGreaterThanOrEqual(9);
    expect(bbox.derecha).toBeLessThanOrEqual(91);
  });

  it('recoloca sprites demasiado laterales hacia zonas seguras', () => {
    const resuelta = resolverPosicionSprite(posicion(72, 84), 'pasillo-urgencias');
    expect(resuelta.x).toBeLessThanOrEqual(70);
    expect(validarSpriteVisible(posicion(72, 84), 'pasillo-urgencias')).toBe(true);
  });

  it('eleva los pies si la cabeza sobrepasa el margen superior', () => {
    const ajustada = ajustarPosicionAlLimites(50, 70, false, 1.62, {
      margenSuperior: 12,
      margenLateral: 9,
      piesYMin: 83,
      piesYMax: 92,
    });

    const bbox = estimarBoundingBoxSprite(ajustada.x, ajustada.piesY, false, 1.62);
    expect(bbox.arriba).toBeGreaterThanOrEqual(12);
  });
});
