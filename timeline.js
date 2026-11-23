/** A numeric track. An optional easing function on a key applies to the interval ending at that key. */
export function keyframes(keys) {
  if (!Array.isArray(keys) || !keys.length) throw new RangeError('empty keyframes');
  const points=keys.map(([time,value,ease],i)=>{
    if (!Number.isFinite(time) || time<0 || !Number.isFinite(value) || (i && time<=keys[i-1][0])) throw new RangeError('keyframe');
    if (ease!==undefined && typeof ease!=='function') throw new TypeError('keyframe easing');
    return {time,value,ease};
  });
  return time=>{
    const next=points.findIndex(point=>time<=point.time);
    if (next===0) return points[0].value;
    if (next<0) return points.at(-1).value;
    const a=points[next-1],b=points[next];
    const phase=(time-a.time)/(b.time-a.time);
    return a.value+(b.value-a.value)*(b.ease ? b.ease(phase) : phase);
  };
}

export function eventList(events=[],duration) {
  if (!Array.isArray(events)) throw new TypeError('effect events');
  return events.map(({at,name,data})=>{
    if (!Number.isFinite(at) || at<0 || at>duration || typeof name!=='string' || !name) throw new RangeError('effect event');
    return {at,name,data};
  }).sort((a,b)=>a.at-b.at);
}

export function visitEvents(events,duration,loop,from,to,includeStart,visit) {
  if (!events.length || to<=from) return;
  const epsilon=1e-10;
  const first=loop?Math.floor(from/duration):0;
  const last=loop?Math.floor((to+epsilon)/duration):0;
  for (let cycle=first;cycle<=last;cycle++) {
    for (const event of events) {
      const time=cycle*duration+event.at;
      if (time>to+epsilon) break;
      if (time>from+epsilon || (includeStart && time===from)) visit(event,time,cycle);
    }
  }
}

export function sampleTracks(tracks,time,base) {
  if (!tracks.length) return base;
  const values={...base};
  for (const [name,sample] of tracks) values[name]=sample(time);
  return values;
}

export function trackEntries(tracks={}) {
  const entries=Object.entries(tracks);
  if (entries.some(([,sample])=>typeof sample!=='function')) throw new TypeError('timeline tracks must be functions');
  return entries;
}
