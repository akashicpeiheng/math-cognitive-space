/** Exact critically damped spring; seconds in, no dependence on frame rate. */
export function atlasSpring(value, velocity, target, seconds, frequency = 13) {
  const offset = value - target, impulse = velocity + frequency * offset;
  const decay = Math.exp(-frequency * seconds);
  return { value: target + (offset + impulse * seconds) * decay,
    velocity: (velocity - frequency * impulse * seconds) * decay };
}

/** Exact displacement under viscous drag, expressed in pixels and seconds. */
export function atlasCoast(velocity, seconds, friction = 7) {
  const decay = Math.exp(-friction * seconds);
  return { distance: velocity * (1 - decay) / friction, velocity: velocity * decay };
}
