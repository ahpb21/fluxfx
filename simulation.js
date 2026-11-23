/** Fixed-step state with deterministic seeking. Advance receives the clock at the end of each step. */
export function createSimulation({initial,advance,duration,step=1/120,checkpointEvery=30,clone=structuredClone}) {
  if (typeof advance!=='function' || typeof clone!=='function') throw new TypeError('simulation advance and clone');
  if (!Number.isFinite(duration) || duration<=0 || !Number.isFinite(step) || step<=0 ||
      !Number.isSafeInteger(Math.ceil(duration/step)) || !Number.isSafeInteger(checkpointEvery) || checkpointEvery<1) {
    throw new RangeError('simulation timing');
  }
  const checkpoints=[clone(initial)];
  let lastTick=0,lastState=checkpoints[0];

  return {
    at(time) {
      if (!Number.isFinite(time) || time<0) throw new RangeError('simulation time');
      const target=Math.floor(Math.min(time,duration)/step+1e-9);
      const index=Math.min(checkpoints.length-1,Math.floor(target/checkpointEvery));
      let tick=index*checkpointEvery,state=checkpoints[index];
      if (lastTick>=tick && lastTick<=target) {tick=lastTick;state=lastState;}
      state=clone(state);
      while (tick<target) {
        tick++;
        const next=advance(state,step,tick*step);
        if (next!==undefined) state=next;
        if (tick%checkpointEvery===0 && tick/checkpointEvery===checkpoints.length) checkpoints.push(clone(state));
      }
      lastTick=tick;
      lastState=state;
      return clone(state);
    },

    invalidateAfter(time) {
      if (!Number.isFinite(time) || time<0) throw new RangeError('simulation time');
      const keepTick=Math.max(0,Math.ceil(time/step-1e-9)-1);
      const count=Math.min(checkpoints.length,Math.floor(keepTick/checkpointEvery)+1);
      checkpoints.length=count;
      if (lastTick>keepTick) {
        lastTick=(count-1)*checkpointEvery;
        lastState=checkpoints[count-1];
      }
    }
  };
}
