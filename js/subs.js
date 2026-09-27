// Radio talk from the house, shown like film subtitles: one line at a
// time, long enough to read.
export function createSubs(el) {
  const queue = [];
  let timer = 0;

  function next() {
    const line = queue.shift();
    if (!line) { el.classList.remove('show'); timer = 0; return; }
    el.innerHTML = '';
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = `${line.who}: `;
    el.append(who, line.text);
    el.classList.add('show');
    timer = setTimeout(next, 1800 + line.text.length * 55);
  }

  return {
    say(who, text) {
      queue.push({ who, text });
      if (!timer) next();
    },
    // Replaces anything still waiting (a new photo interrupts the last one).
    sayAll(who, lines) {
      queue.length = 0;
      clearTimeout(timer);
      timer = 0;
      for (const text of lines) queue.push({ who, text });
      next();
    },
  };
}
