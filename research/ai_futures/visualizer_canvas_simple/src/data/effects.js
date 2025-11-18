/**
 * Helper to build effect objects succinctly
 * Effects modify state variables when actions are taken
 */
export const eff = ({
  compute = 1,
  rnd = 1,
  sec = 0,
  hack = 0,
  align = 0,
  gov = 0,
} = {}) => ({
  mul: { compute, rnd },
  add: { sec, hack, align, gov }
});

/**
 * Apply an effect to current variables
 */
export const applyEffect = (vars, effect) => {
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  
  return {
    compute: vars.compute * (effect.mul?.compute ?? 1),
    rnd: vars.rnd * (effect.mul?.rnd ?? 1),
    sec: Math.max(0, Math.min(5, vars.sec + (effect.add?.sec ?? 0))),
    hack: clamp01(vars.hack + (effect.add?.hack ?? 0)),
    align: clamp01(vars.align + (effect.add?.align ?? 0)),
    gov: clamp01(vars.gov + (effect.add?.gov ?? 0)),
  };
};
